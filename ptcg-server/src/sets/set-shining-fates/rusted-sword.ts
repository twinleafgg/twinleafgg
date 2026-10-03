import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { TOOL_ACTIVE_DAMAGE_BONUS } from '../../game/store/prefabs/tool-prefabs';

export class RustedSword extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'SHF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public regulationMark = 'D';
  public name: string = 'Rusted Sword';
  public fullName: string = 'Rusted Sword SHF';

  public text: string =
    "The attacks of the Zacian V this card is attached to do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Refs: set-dark-explorers/dark-claw.ts (tool active-damage bonus), prefabs/prefabs.ts (TOOL_ACTIVE_DAMAGE_BONUS)
    TOOL_ACTIVE_DAMAGE_BONUS(store, state, effect, this, {
      damageBonus: 30,
      sourcePokemonName: 'Zacian V',
    });

    return state;
  }
}
