import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { StateUtils } from '../../game';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class HereComesTeamRocket extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TR';
  public setNumber: string = '15';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Here Comes Team Rocket!';
  public fullName: string = 'Here Comes Team Rocket! TR';

  public text: string =
    'Each player turns all of his or her Prize cards face up. (Those Prize cards remain face up for the rest of the game.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      player.prizes.forEach((prize) => {
        if (!prize.faceUpPrize) {
          prize.faceUpPrize = true;
          prize.isSecret = false;
          prize.isPublic = true;
        }
      });
      opponent.prizes.forEach((prize) => {
        if (!prize.faceUpPrize) {
          prize.faceUpPrize = true;
          prize.isSecret = false;
          prize.isPublic = true;
        }
      });
    }

    return state;
  }
}
