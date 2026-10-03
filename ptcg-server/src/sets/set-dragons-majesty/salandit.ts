import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../game/store/prompts/shuffle-prompt';
import { GameMessage } from '../../game/game-message';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

function* useCallforFamily(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  const slot = player.bench.find(b => b.cards.length === 0);

  if (slot === undefined) {
    return state;
  }

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
    player.deck,
    { superType: SuperType.POKEMON, stage: Stage.BASIC },
    { min: 1, max: 1, allowCancel: false }
  ), selected => {
    const cards = selected || [];
    MOVE_CARDS(store, state, player.deck, slot, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
    slot.pokemonPlayedTurn = state.turn;
    next();
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Salandit extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 60;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Call for Family',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Search your deck for a Basic Pokemon and put it onto your Bench. Then, shuffle your deck.'
  },
  {
    name: 'Dig Claws',
    cost: [CardType.FIRE, CardType.COLORLESS],
    damage: 20,
    text: ''
  },
  ];

  public set: string = 'DRM';

  public setNumber: string = '13';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Salandit';

  public fullName: string = 'Salandit DRM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useCallforFamily(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }

}