import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, Player } from '../../../game';
import {
  DRAW_CARDS,
  SHUFFLE_DECK,
  COIN_FLIP_PROMPT,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Harlequin,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: self,
  });

  const cards = player.hand.cards.filter((c) => c !== self);

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let coinResult = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coinResult = result;
    next();
  });

  const playerMoveEffect = new MoveCardsEffect(player.hand, player.deck, {
    cards,
    sourceCard: self,
  });
  state = store.reduceEffect(state, playerMoveEffect);

  const opponentMoveEffect = new MoveCardsEffect(opponent.hand, opponent.deck, {
    sourceCard: self,
  });
  state = store.reduceEffect(state, opponentMoveEffect);

  // opponent shuffle and draw
  if (!opponentMoveEffect.preventDefault) {
    SHUFFLE_DECK(store, state, opponent);
    DRAW_CARDS(store, state, opponent, coinResult ? 3 : 5);
  }

  // player shuffle and draw
  SHUFFLE_DECK(store, state, player);
  DRAW_CARDS(store, state, player, coinResult ? 5 : 3);
}

export class Harlequin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'WHT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';

  public regulationMark = 'I';

  public name: string = 'Harlequin';
  public fullName: string = 'Harlequin WHT';

  public text: string =
    'Each player shuffles their hand into their deck. Then, flip a coin. If heads, you draw 5 cards, and your opponent draws 3 cards. If tails, you draw 3 cards, and your opponent draws 5 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }

    return true;
  }
}
