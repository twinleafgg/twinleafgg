import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckAttackCostEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEBODY_BLOCKED, THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mightyena extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Poochyena';
  public hp: number = 90;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Cold Feet',
    powerType: PowerType.POKEBODY,
    text: 'If Mightyena is affected by a Special Condition, ignore all Energy necessary to use Mightyena\'s attacks.'
  }];

  public attacks = [{
    name: 'Collude',
    cost: [D, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If you played any Supporter card from your hand during this turn, this attack does 20 damage plus 20 more damage.'
  }, {
    name: 'Desperate Attack',
    cost: [D, D, C],
    damage: 50,
    damageCalculation: '+',
    text: 'If Mightyena has less Energy attached to it than the Defending Pokémon, this attack does 50 damage plus 30 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '54';
  public name: string = 'Mightyena';
  public fullName: string = 'Mightyena PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cold Feet
    if (effect instanceof CheckAttackCostEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (player.active.specialConditions.length > 0) {
        effect.cost = [];
      }
    }

    // Collude
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.supporterTurn > 0) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 20);
      }
    }

    // Desperate Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const playerEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, playerEnergy);
      const opponentEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, opponentEnergy);
      if (playerEnergy.energyMap.length < opponentEnergy.energyMap.length) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 30);
      }
    }

    return state;
  }
}
