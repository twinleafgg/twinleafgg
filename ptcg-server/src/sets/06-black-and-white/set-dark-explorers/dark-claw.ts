import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TOOL_ACTIVE_DAMAGE_BONUS } from '../../../game/store/prefabs/tool-prefabs';

export class DarkClaw extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'DEX';

  public name: string = 'Dark Claw';

  public fullName: string = 'Dark Claw DEX';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '92';

  public text: string =
    'If this card is attached to a [D] Pokémon, each of the attacks ' +
    'of that Pokémon does 20 more damage to the Active Pokémon ' +
    '(before applying Weakness and Resistance).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Refs: set-boundaries-crossed/crystal-edge.ts (tool active-damage bonus), prefabs/prefabs.ts (TOOL_ACTIVE_DAMAGE_BONUS)
    TOOL_ACTIVE_DAMAGE_BONUS(store, state, effect, this, {
      damageBonus: 20,
      sourceCardType: CardType.DARK,
    });

    return state;
  }
}
