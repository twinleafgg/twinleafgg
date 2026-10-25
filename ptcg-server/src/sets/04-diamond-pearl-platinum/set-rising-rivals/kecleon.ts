import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEBODY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kecleon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Colorful Body',
    powerType: PowerType.POKEBODY,
    text: 'Kecleon\'s type is [G][R][W][L][P][F][D][M][C].'
  }];

  public attacks = [{
    name: 'Triple Smash',
    cost: [C, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip 3 coins. This attack does 10 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Kecleon';
  public fullName: string = 'Kecleon RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Colorful Body
    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this
      && !IS_POKEBODY_BLOCKED(store, state, StateUtils.findOwner(state, effect.target), this)) {
      effect.cardTypes = [G, R, W, L, P, F, D, M, C];
    }

    // Triple Smash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage += 20 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
