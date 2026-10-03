import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

export class NormaliumZTackle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'UNM';
  public setNumber: string = '203';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Normalium Z: Tackle';
  public fullName: string = 'Normalium Z: Tackle UNM';
  public text: string =
    'If the Pokémon this card is attached to has the Tackle attack, it can use the GX attack on this card. (You still need the necessary Energy to use this attack.)';

  // TODO: Z-Crystal GX attack mechanic is not currently implementable in the engine.
  // This requires adding a GX attack to the attached Pokemon dynamically based on having the Tackle attack.

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return state;
  }
}
