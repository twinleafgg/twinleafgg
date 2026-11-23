import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_FROM_OPPONENT_HAND_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import {
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  JUST_EVOLVED,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class Xatu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Natu';
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Energy Leap',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may look at your opponent\'s hand, choose an Energy card you find there, and attach it to 1 of their Pokémon.'
  }];

  public attacks = [{
    name: 'Psychic',
    cost: [P, C],
    damage: 20,
    damageCalculation: '+',
    text: 'This attack does 40 more damage for each Energy attached to your opponent\'s Active Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Xatu';
  public fullName: string = 'Xatu FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Leap
    if (JUST_EVOLVED(effect, this) && !IS_ABILITY_BLOCKED(store, state, effect.player, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      return CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }

        ATTACH_ENERGY_FROM_OPPONENT_HAND_FROM_ABILITY(
          store,
          state,
          player,
          this.powers[0],
          this,
        );
      });
    }

    // Psychic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const checkEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, checkEnergy);
      const energyCount = checkEnergy.energyMap.reduce((sum, em) => sum + em.provides.length, 0);
      effect.damage += 40 * energyCount;
    }

    return state;
  }
}
