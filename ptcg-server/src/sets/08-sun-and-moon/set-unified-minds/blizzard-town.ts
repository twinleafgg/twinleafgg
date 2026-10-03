import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { AttackEffect, UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class BlizzardTown extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'UNM';
  public setNumber: string = '187';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Blizzard Town';
  public fullName: string = 'Blizzard Town UNM';
  public text: string =
    "Pokémon with 40 HP or less remaining (both yours and your opponent's) can't attack.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    if (effect instanceof AttackEffect && StateUtils.getStadiumCard(state) === this) {
      const attacker = effect.player.active;

      // Check remaining HP = max HP - damage
      const checkHp = new CheckHpEffect(effect.player, attacker);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.player.active, this)) {
        return state;
      }

      store.reduceEffect(state, checkHp);
      const remainingHp = checkHp.hp - attacker.damage;

      if (remainingHp <= 40) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
    }

    return state;
  }
}
