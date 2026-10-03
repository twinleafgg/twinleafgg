import { StateUtils } from '../../../game';
import { SpecialCondition, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { BeginTurnEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {
  ADD_MARKER,
  COIN_FLIP_PROMPT,
  HAS_MARKER,
  REMOVE_MARKER,
} from '../../../game/store/prefabs/prefabs';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SlumberingForest extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'UNM';
  public name: string = 'Slumbering Forest';
  public fullName: string = 'Slumbering Forest UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '207';

  public text: string =
    'If a Pokémon is Asleep, its owner flips 2 coins instead of 1 for that Special Condition between turns. If either of them is tails, that Pokémon is still Asleep.';

  public readonly SLUMBERING_MARKER = 'SLUMBERING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && StateUtils.getStadiumCard(state) === this) {
      const players = [effect.player, StateUtils.getOpponent(state, effect.player)];

      players.forEach((player) => {
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
          return;
        }

        if (player.active.specialConditions.includes(SpecialCondition.ASLEEP)) {
          ADD_MARKER(this.SLUMBERING_MARKER, player, this);
        }
      });
    }

    if (effect instanceof BeginTurnEffect && StateUtils.getStadiumCard(state) === this) {
      const players = [effect.player, StateUtils.getOpponent(state, effect.player)];

      players.forEach((player) => {
        if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
          REMOVE_MARKER(this.SLUMBERING_MARKER, player, this);
          return;
        }

        if (
          !player.active.specialConditions.includes(SpecialCondition.ASLEEP) &&
          HAS_MARKER(this.SLUMBERING_MARKER, player, this)
        ) {
          // heads on first coin flip, now flip again
          COIN_FLIP_PROMPT(store, state, player, (result: boolean) => {
            if (!result) {
              player.active.addSpecialCondition(SpecialCondition.ASLEEP);
            }
          });
          REMOVE_MARKER(this.SLUMBERING_MARKER, player, this);
        } else {
          REMOVE_MARKER(this.SLUMBERING_MARKER, player, this);
        }
      });
    }

    return state;
  }
}
