import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Xatu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Natu';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Psywave',
    cost: [P],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the amount of Energy attached to the Defending Pokémon.'
  },
  {
    name: 'Confuse Ray',
    cost: [P, C, C],
    damage: 50,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Xatu';
  public fullName: string = 'Xatu UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psywave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const energyCount = checkProvidedEnergy.energyMap.reduce((left, p) => left + p.provides.length, 0);
      effect.damage = 20 * energyCount;
    }

    // Confuse Ray
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    return state;
  }
}
