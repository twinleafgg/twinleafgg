import { Card, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

function* useAscension(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;
  if (player.deck.cards.length === 0) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_EVOLVE,
    player.deck,
    { superType: SuperType.POKEMON, evolvesFrom: 'Ponyta' },
    { min: 0, max: 1, allowCancel: true }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.deck, player.active, { cards, sourceCard: effect.source.getPokemonCard()! });
    player.active.clearEffects();
    player.active.pokemonPlayedTurn = state.turn;
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Ponyta extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Ascension',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a card that evolves from Ponyta and put it onto Ponyta. (This counts as evolving Ponyta.) Shuffle your deck afterward.'
  }, {
    name: 'Combustion',
    cost: [R, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Ponyta';
  public fullName: string = 'Ponyta AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ascension
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useAscension(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
