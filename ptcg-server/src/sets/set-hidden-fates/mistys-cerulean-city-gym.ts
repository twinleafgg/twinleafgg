import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { GameError, GameMessage, StoreLike, State, StateUtils } from '../../game';
import { DealDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../game/store/prefabs/stadium-effect';

export class MistysCeruleanCityGym extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'HIF';
  public setNumber: string = '61';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Misty's Cerulean City Gym";
  public fullName: string = "Misty's Cerulean City Gym HIF";
  public text: string =
    "The attacks of Starmie-GX (both yours and your opponent's) do 40 more damage to the opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (
        effect.target !== opponent.active ||
        effect.source.getPokemonCard()?.name !== 'Starmie-GX' ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, opponent, effect.target)
      ) {
        return state;
      }
      effect.damage += 40;
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
