import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Rhydon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Rhyhorn';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Fury Attack',
    cost: [F],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 20 damage times the number of heads.'
  }, {
    name: 'Rock Tumble',
    cost: [F, F, C],
    damage: 60,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Rhydon';
  public fullName: string = 'Rhydon SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fury Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 20 * results.filter(r => r).length;
      });
    }

    // Rock Tumble
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
