import { Effect } from '../../game/store/effects/effect';
import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { COIN_FLIP_PROMPT, DRAW_CARDS } from '../../game/store/prefabs/prefabs';

export class BillsTeleporter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'N1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public name: string = "Bill's Teleporter";
  public fullName: string = "Bill's Teleporter N1";

  public text: string = 'Flip a coin. If heads, draw 4 cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      COIN_FLIP_PROMPT(store, state, effect.player, (result) => {
        if (result) {
          const player = effect.player;
          DRAW_CARDS(store, state, player, 4);
        }
      });
    }

    return state;
  }
}
