import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import {
  MoveDamageCountersEffect,
  PlaceDamageCountersEffect,
} from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class BattleColosseum extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'I';
  public set: string = 'PFL';
  public name: string = 'Battle Cage';
  public fullName: string = 'Battle Colosseum M2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public text: string =
    "Prevent all damage counters from being placed on Benched Pokémon (both yours and your opponent's) by effects of attacks and Abilities from the opponent's Pokémon. (Damage from attacks is still taken.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof MoveDamageCountersEffect && StateUtils.getStadiumCard(state) === this) {
      const activePlayer = state.players[state.activePlayer];
      const opponentOfActive = StateUtils.getOpponent(state, activePlayer);
      if (effect.player === opponentOfActive) {
        effect.preventDefault = true;
      }
    }

    if (effect instanceof PutCountersEffect && StateUtils.getStadiumCard(state) === this) {
      const sourcePokemon = effect.source;
      if (sourcePokemon) {
        const targetOwner = StateUtils.findOwner(state, effect.target);
        const targetOpponent = StateUtils.getOpponent(state, targetOwner);
        const sourceOwner = StateUtils.findOwner(state, sourcePokemon);
        if (sourceOwner === targetOpponent) {
          // Check if the target is a benched Pokemon (not active)
          if (effect.target !== targetOwner.active && effect.target !== targetOpponent.active) {
            if (!IS_STADIUM_EFFECT_BLOCKED(store, state, targetOwner, effect.target, this)) {
              effect.preventDefault = true;
            }
          }
        }
      }
    }

    if (effect instanceof PlaceDamageCountersEffect && StateUtils.getStadiumCard(state) === this) {
      if (effect.source) {
        const sourceCardList = StateUtils.findPokemonSlot(state, effect.source);
        if (sourceCardList) {
          const targetOwner = StateUtils.findOwner(state, effect.target);
          const targetOpponent = StateUtils.getOpponent(state, targetOwner);
          const sourceOwner = StateUtils.findOwner(state, sourceCardList);
          if (sourceOwner === targetOpponent) {
            if (effect.target !== targetOwner.active && effect.target !== targetOpponent.active) {
              if (!IS_STADIUM_EFFECT_BLOCKED(store, state, targetOwner, effect.target, this)) {
                effect.preventDefault = true;
              }
            }
          }
        }
      }
    }

    return state;
  }
}
