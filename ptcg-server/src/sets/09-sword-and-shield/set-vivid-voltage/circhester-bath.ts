import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { GamePhase } from '../../../game/store/state/state';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class CirchesterBath extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark: string = 'D';
  public set: string = 'VIV';
  public setNumber: string = '150';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Circhester Bath';
  public fullName: string = 'Circhester Bath VIV';
  public text: string =
    "All Basic Pokémon (both yours and your opponent's) take 20 less damage from attacks from the opponent's Pokémon (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && state.phase === GamePhase.ATTACK) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== this) {
        return state;
      }

      const targetPokemonCard = effect.target.getPokemonCard();
      if (targetPokemonCard && targetPokemonCard.stage === Stage.BASIC) {
        const owner = StateUtils.findOwner(state, effect.target);
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target, this)) {
          return state;
        }

        effect.damage = Math.max(0, effect.damage - 20);
      }
    }

    return state;
  }
}
