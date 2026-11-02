import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { EnergyCard, PowerType, State, StoreLike } from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pupitar extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Larvitar';
  public hp: number = 70;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Boost Gas',
    powerType: PowerType.POKEBODY,
    text: 'If Pupitar has any Energy attached to it, the Retreat Cost of Pupitar is 0.'
  }];

  public attacks = [{
    name: 'Rage',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each damage counter on Pupitar.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Pupitar';
  public fullName: string = 'Pupitar UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Boost Gas
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      if (IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      const hasEnergy = effect.player.active.cards.some(c => c instanceof EnergyCard);
      if (hasEnergy) {
        effect.cost = [];
      }
    }

    // Rage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage += effect.player.active.damage;
    }

    return state;
  }
}
