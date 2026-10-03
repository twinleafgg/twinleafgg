import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect, HealTargetEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { PokemonCard, PokemonCardList } from '../../../game';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class EmergencyJelly extends TrainerCard {
  public regulationMark = 'F';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '155';

  public name = 'Emergency Jelly';

  public fullName = 'Emergency Jelly SIT';

  public text: string =
    'At the end of each turn, if the Pokémon this card is attached to has 30 HP or less remaining and has any damage counters on it, heal 120 damage from it. If you healed any damage in this way, discard this card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this)) {
      if (effect instanceof EndTurnEffect && effect.target.tools.includes(this)) {
        const targetPokemon = effect.target.getPokemonCard();

        // Try to reduce ToolEffect, to check if something is blocking the tool from working
        try {
          const stub = new ToolEffect(effect.player, this);
          store.reduceEffect(state, stub);
        } catch {
          return state;
        }

        if (targetPokemon && (targetPokemon as PokemonCard).hp <= 30) {
          const healTargetEffect = new HealTargetEffect(effect as unknown as AttackEffect, 30);
          (healTargetEffect.target as PokemonCardList) =
            targetPokemon as unknown as PokemonCardList;
          state = store.reduceEffect(state, healTargetEffect);
        }
        return state;
      }
      return state;
    }
    return state;
  }
}
