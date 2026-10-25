import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mudkip extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Mud Sport',
    cost: [W],
    damage: 10,
    damageCalculation: '+',
    text: 'If Mudkip has less Energy attached to it than the Defending Pokémon, this attack does 10 damage plus 10 more damage.'
  }, {
    name: 'Surf',
    cost: [W, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '116';
  public name: string = 'Mudkip';
  public fullName: string = 'Mudkip SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mud Sport
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const playerProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, playerProvidedEnergy);
      const playerEnergyCount = playerProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0
      );
      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0
      );
      if (playerEnergyCount < opponentEnergyCount) {
        effect.damage += 10;
      }
    }

    return state;
  }
}
