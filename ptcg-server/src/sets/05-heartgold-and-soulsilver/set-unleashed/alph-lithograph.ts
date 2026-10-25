import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class AlphLithograph extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'UL';
  public name: string = 'Alph Lithograph';
  public fullName: string = 'Alph Lithograph UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'TWO';
  public text: string = 'Shuffle your deck!';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      SHUFFLE_DECK(store, state, effect.player);
    }

    return state;
  }
}
