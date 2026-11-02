import { EnergyCard } from '../../../game';
import { CardType } from '../../../game';
import { EnergyType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_SPECIAL_ENERGY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class RecoverEnergy extends EnergyCard {
  public provides: CardType[] = [C];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'MD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Recover Energy';
  public fullName: string = 'Recover Energy MD';
  public text: string = 'Recover Energy provides Colorless Energy. When you attach this card from your hand to 1 of your Pokémon, remove all Special Conditions from that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      if (IS_SPECIAL_ENERGY_BLOCKED(store, state, effect.player, this, effect.target)) {
        return state;
      }
      const conditions = effect.target.specialConditions.slice();
      conditions.forEach(condition => effect.target.removeSpecialCondition(condition));
    }

    return state;
  }
}
