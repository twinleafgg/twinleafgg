import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  ShuffleDeckPrompt,
} from '../../../game';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { Card } from '../../../game/store/card/card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useCallingJutsu(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;
  const max = Math.min(
    3,
    player.deck.cards.filter((c) => c.superType === SuperType.POKEMON).length,
  );
  if (max === 0) {
    return state;
  }
  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.POKEMON },
      { min: 0, max, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );
  cards.forEach((c) => MOVE_CARDS(store, state, player.deck, player.hand, { cards: [c], sourceCard: effect.source.getPokemonCard()! }));
  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Frogadier extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Froakie';
  public hp: number = 100;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Summoning Jutsu',
      cost: [W],
      damage: 0,
      text: 'Search your deck for up to 3 Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Aqua Edge',
      cost: [W, W],
      damage: 50,
      text: '',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Frogadier';
  public fullName: string = 'Frogadier M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useCallingJutsu(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
