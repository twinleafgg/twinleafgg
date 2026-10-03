import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { GameError, GameMessage, StoreLike, State, StateUtils } from '../../game';
import { DealDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../game/store/prefabs/stadium-effect';

export class BrocksPewterCityGym extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'HIF';
  public setNumber: string = '54';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Brock's Pewter City Gym";
  public fullName: string = "Brock's Pewter City Gym HIF";
  public text: string =
    "Onix-GX (both yours and your opponent's) take 40 less damage from the opponent's attacks (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const targetCard = effect.target.getPokemonCard();

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      if (targetCard && targetCard.name === 'Onix-GX' && effect.damage > 0) {
        effect.damage = Math.max(0, effect.damage - 40);
      }
    }

    return state;
  }
}
