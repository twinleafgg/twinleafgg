import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { StateUtils } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class FutureBoosterEnergyCapsule extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'G';

  protected _tags = [CardTag.FUTURE];

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '164';

  public set: string = 'PAR';

  public name: string = 'Future Booster Energy Capsule';

  public fullName: string = 'Future Booster Energy Capsule PAR';

  public text: string =
    "The Future Pokémon this card is attached to has no Retreat Cost, and the attacks it uses do 20 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      if (effect.target !== player.active && effect.target !== opponent.active) {
        return state;
      }

      if (effect.player.active.futurePokemon()) {
        effect.damage += 20;
      }
    }

    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (effect.player.active.futurePokemon()) {
        effect.cost = [];
      }
      return state;
    }
    return state;
  }
}
