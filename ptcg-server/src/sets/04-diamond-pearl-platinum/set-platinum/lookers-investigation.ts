import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameError, GameMessage, SelectOptionPrompt, StateUtils } from '../../../game';
import {
  DRAW_CARDS,
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';

export class LookersInvestigation extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PL';
  public name: string = "Looker's Investigation";
  public fullName: string = "Looker's Investigation PL";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';

  public text: string =
    "Look at your opponent's hand, then choose you or your opponent. That player shuffles his or her hand into his or her deck and draws up to 5 cards.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);

      state = store.prompt(
        state,
        new SelectOptionPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          [
            'You shuffle your hand into your deck and draw 5 cards.',
            'Your opponent shuffles his or her hand into his or her deck and draws 5 cards.',
          ],
          {
            allowCancel: false,
            defaultValue: 0,
          },
        ),
        (choice) => {
          if (choice === 0) {
            // Option 1
            MOVE_CARDS(store, state, player.hand, player.deck);
            SHUFFLE_DECK(store, state, player);
            DRAW_CARDS(store, state, player, 5);
          } else if (choice === 1) {
            // Option 2
            MOVE_CARDS(store, state, opponent.hand, opponent.deck);
            SHUFFLE_DECK(store, state, opponent);
            DRAW_CARDS(store, state, opponent, 5);
          }
        },
      );
    }

    return state;
  }
}
