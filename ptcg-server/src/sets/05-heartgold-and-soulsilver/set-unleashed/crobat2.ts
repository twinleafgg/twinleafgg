import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Crobat2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Golbat';
  public hp: number = 110;
  public cardType: CardType[] = [P];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Supersonic',
    cost: [P],
    damage: 30,
    text: 'The Defending Pokémon is now Confused.'
  },
  {
    name: 'Hurricane Wing',
    cost: [P, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 4 coins. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Crobat';
  public fullName: string = 'Crobat UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Supersonic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
    }

    // Hurricane Wing
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 4, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
