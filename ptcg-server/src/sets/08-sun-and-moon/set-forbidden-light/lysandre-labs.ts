import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';

export class LysandreLabs extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'FLI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '111';

  public name: string = 'Lysandre Labs';

  public fullName: string = 'Lysandre Labs FLI';

  public text: string =
    "Pokémon Tool cards in play (both yours and your opponent's) have no effect.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return state;
  }
}
