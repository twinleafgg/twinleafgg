import { CardTag, CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sceptileex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Grovyle';
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 310;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Poison Claw',
    cost: [G],
    damage: 40,
    text: 'Your opponent\'s Active Pokémon is now Poisoned.'
  },
  {
    name: 'Assassin Blade',
    cost: [G, G],
    damage: 160,
    damageCalculation: '+',
    text: 'This attack does 50 more damage for each Special Condition affecting your opponent\'s Active Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Sceptile ex';
  public fullName: string = 'Sceptile ex FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Claw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    // Assassin Blade
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage += 50 * opponent.active.specialConditions.length;
    }

    return state;
  }
}
