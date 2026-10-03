import { Card, ChooseCardsPrompt, GameMessage, ShowCardsPrompt, ShuffleDeckPrompt, Stage, StateUtils, SuperType } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { COPY_ATTACK_VIA_ABILITY } from '../../../game/store/prefabs/copy-attack-prefabs';
import { WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useEncounter(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.POKEMON },
    { min: 0, max: 1, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  cards.forEach((card) => {
    MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: effect.source.getPokemonCard()! });
  });

  state = store.prompt(state, new ShowCardsPrompt(
    opponent.id,
    GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
    cards), () => state);

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Mew extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 50;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [];

  public powers = [{
    name: 'Memories of Dawn',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'This Pokémon can use the attacks of any of your Basic Pokémon in play. (You still need the necessary Energy to use each attack.)'
  }];

  public attacks = [{
    name: 'Encounter',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Search your deck for a Pokémon, reveal it, and put it into your hand. Shuffle your deck afterward.'
  }];

  public set: string = 'FCO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '29';

  public name: string = 'Mew';

  public fullName: string = 'Mew FCO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      return COPY_ATTACK_VIA_ABILITY(store, state, effect, {
        copycatCard: this,
        filter: (_cardList, card) => card.stage === Stage.BASIC,
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useEncounter(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
