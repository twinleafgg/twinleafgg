import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
  ShowCardsPrompt,
  StateUtils,
  GameError,
} from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export function* useRapidStrikeSearch(
  next: Function,
  store: StoreLike,
  state: State,
  self: PokemonCard,
  effect: PowerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof Card && card.hasTag(CardTag.RAPID_STRIKE))) {
      blocked.push(index);
    }
  });

  if (player.usedRapidStrikeSearchThisTurn) {
    throw new GameError(GameMessage.POWER_ALREADY_USED);
  }

  player.usedRapidStrikeSearchThisTurn = true;

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      {},
      { min: 1, max: 1, allowCancel: true, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Octillery extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Remoraid';

  public regulationMark = 'E';

  protected _tags = [CardTag.RAPID_STRIKE];

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 110;

  public weakness = [{ type: CardType.LIGHTNING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Rapid Strike Search',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text:
        'Once during your turn, you may search your deck for a ' +
        'Rapid Strike card, reveal it, and put it into your hand. ' +
        "Then, shuffle your deck. You can't use more than 1 Rapid " +
        'Strike Search Ability each turn.',
    },
  ];

  public attacks = [
    {
      name: 'Waterfall',
      cost: [CardType.WATER, CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      text: '',
    },
  ];

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '37';

  public name: string = 'Octillery';

  public fullName: string = 'Octillery BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useRapidStrikeSearch(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
