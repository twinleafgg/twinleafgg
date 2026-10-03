import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { BLOCK_TRAINER_TARGET, IS_TRAINER_TARGET } from '../../../game/store/prefabs/prefabs';

export class LeafyCamoPoncho extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public name: string = 'Leafy Camo Poncho';
  public fullName: string = 'Leafy Camo Poncho SIT';
  public set: string = 'SIT';
  public setNumber: string = '160';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // If this is a supporter effect from the opponent
    if (
      IS_TRAINER_TARGET(effect, { card: this, trainerType: TrainerType.SUPPORTER }) &&
      (effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_VSTAR) ||
        effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_VMAX))
    ) {
      BLOCK_TRAINER_TARGET(effect);
    }
    return state;
  }
}
