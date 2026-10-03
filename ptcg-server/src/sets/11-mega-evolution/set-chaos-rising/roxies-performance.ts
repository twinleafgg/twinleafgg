import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { RetreatEffect, RetreatStartEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { SpecialCondition } from '../../../game/store/card/card-types';
import { StateUtils, StoreLike, State, Player } from '../../../game';
import { GameError, GameMessage } from '../../../game';
import { ADD_MARKER, REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';

const ROXIE_POISONED_NO_RETREAT = 'ROXIE_POISONED_NO_RETREAT';

export class RoxiesPerformance extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = "Roxie's Performance";
  public fullName: string = "Roxie's Performance M4";
  public text: string =
    "During your opponent's next turn, their Poisoned Pokémon can't retreat. (This includes newly Poisoned Pokémon.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      ADD_MARKER(ROXIE_POISONED_NO_RETREAT, opponent, this);
    }
    if (effect instanceof EndTurnEffect) {
      REMOVE_MARKER_AT_END_OF_TURN(effect, ROXIE_POISONED_NO_RETREAT, this);
    }
    if (effect instanceof RetreatEffect || effect instanceof RetreatStartEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.marker.hasMarker(ROXIE_POISONED_NO_RETREAT, this)) {
        const isPoisoned = player.active.specialConditions.includes(SpecialCondition.POISONED);
        if (isPoisoned) {
          throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
        }
      }
    }
    return state;
  }
}
