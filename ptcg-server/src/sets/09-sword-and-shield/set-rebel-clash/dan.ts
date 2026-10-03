import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameError, GameMessage, SelectPrompt, StateUtils } from '../../../game';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Dan extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RCL';
  public name: string = 'Dan';
  public fullName: string = 'Dan RCL';
  public regulationMark = 'D';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '158';

  public text: string =
    'Draw 2 cards. You and your opponent play Rock-Paper-Scissors until someone wins. If you win, draw 2 more cards.';

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

      DRAW_CARDS(store, state, player, 2);

      const options = [
        { value: 'Rock', message: 'Rock' },
        { value: 'Paper', message: 'Paper' },
        { value: 'Scissors', message: 'Scissors' },
      ];

      // simultaneous prompt showing gaming
      store.prompt(
        state,
        [
          new SelectPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            options.map((c) => c.message),
            { allowCancel: false },
          ),
          new SelectPrompt(
            opponent.id,
            GameMessage.CHOOSE_OPTION,
            options.map((c) => c.message),
            { allowCancel: false },
          ),
        ],
        (results) => {
          // variable time
          const playerChosenValue = results[0];
          const opponentChosenValue = results[1];
          // if they tie, restart it
          if (playerChosenValue === opponentChosenValue) {
            return this.reduceEffect(store, state, effect);
          }

          // Gotta make the win conditions
          if (
            (playerChosenValue === 1 && opponentChosenValue === 0) ||
            (playerChosenValue === 2 && opponentChosenValue === 1) ||
            (playerChosenValue === 0 && opponentChosenValue === 2)
          ) {
            DRAW_CARDS(store, state, player, 2);
          }
        },
      );
    }

    return state;
  }
}
