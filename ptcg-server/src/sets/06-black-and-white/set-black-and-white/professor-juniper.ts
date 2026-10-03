import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { Player } from '../../../game';

export class ProfessorJuniper extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'BLW';
  public name: string = 'Professor Juniper';
  public fullName: string = 'Professor Juniper BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public text: string = 'Discard your hand and draw 7 cards.';

  public canPlay(_: StoreLike, __: State, player: Player): boolean {
    return !(player.supporterTurn > 0 && player.deck.cards.length === 0);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const cards = player.hand.cards.filter((c) => c !== this);
      if (cards.length > 0) {
        state = MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
      }
      state = DRAW_CARDS(store, state, player, 7);
    }

    return state;
  }
}
