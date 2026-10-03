import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameError, GameMessage, StateUtils } from '../../../game';
import { CONFIRMATION_PROMPT, DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class CheerleadersCheer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CL';
  public name: string = "Cheerleader's Cheer";
  public fullName: string = "Cheerleader's Cheer CL";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';

  public text: string = 'Draw 3 cards. Your opponent may draw a card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      DRAW_CARDS(store, state, player, 3);

      if (opponent.deck.cards.length > 0) {
        CONFIRMATION_PROMPT(
          store,
          state,
          opponent,
          (result) => {
            if (result) {
              DRAW_CARDS(store, state, opponent, 1);
            }
          },
          GameMessage.WANT_TO_DRAW_CARDS,
        );
      }
    }

    return state;
  }
}
