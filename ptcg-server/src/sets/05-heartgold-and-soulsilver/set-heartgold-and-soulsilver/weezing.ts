import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Weezing extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Koffing';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Super Poison Breath',
    cost: [P],
    damage: 0,
    text: 'The Defending Pokémon is now Poisoned.'
  },
  {
    name: 'Super Explosion',
    cost: [C, C],
    damage: 90,
    text: 'Weezing does 90 damage to itself, and don\'t apply Weakness to this damage.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Weezing';
  public fullName: string = 'Weezing HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Poison Breath
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    // Super Explosion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const ignoreWeakness = effect.ignoreWeakness;
      effect.ignoreWeakness = true;
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 90);
      effect.ignoreWeakness = ignoreWeakness;
    }

    return state;
  }
}
