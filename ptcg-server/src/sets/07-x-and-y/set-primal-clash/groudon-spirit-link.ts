import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { SPIRIT_LINK_SKIP_MEGA_EVOLUTION_END_TURN } from '../../../game/store/prefabs/tool-prefabs';

export class GroudonSpiritLink extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PRC';
  public name: string = 'Groudon Spirit Link';
  public fullName: string = 'Groudon Spirit Link PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';

  public text: string =
    'Your turn does not end if the Pokémon this card is attached to becomes Primal Groudon-EX.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    SPIRIT_LINK_SKIP_MEGA_EVOLUTION_END_TURN(store, state, effect, this, 'Primal Groudon-EX');
    return state;
  }
}
