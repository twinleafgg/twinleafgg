import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckAttackCostEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { ATTACH_ENERGY_PROMPT, COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lotad extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Energy Ball',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 10 more damage for each Energy attached to Lotad but not used to pay for this attack\'s Energy cost. You can\'t add more than 20 damage in this way.'
  }, {
    name: 'Synthesis',
    cost: [G],
    damage: 0,
    text: 'Flip a coin. If heads, search your deck for a Grass Energy card and attach it to 1 of your Pokémon. Shuffle your deck afterward.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Lotad';
  public fullName: string = 'Lotad PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Ball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkCost = new CheckAttackCostEffect(player, this.attacks[0]);
      state = store.reduceEffect(state, checkCost);
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkEnergy);
      const extraEnergy = checkEnergy.energyMap.length - checkCost.cost.length;
      if (extraEnergy === 1) {
        effect.damage += 10;
      } else if (extraEnergy >= 2) {
        effect.damage += 20;
      }
    }

    // Synthesis
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          ATTACH_ENERGY_PROMPT(
            store,
            state,
            effect.player,
            PlayerType.BOTTOM_PLAYER,
            SlotType.DECK,
            [SlotType.ACTIVE, SlotType.BENCH],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
            { min: 0, max: 1, allowCancel: true }
          );
        }
      });
    }

    return state;
  }
}
