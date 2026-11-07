import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Steelix extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Onix';
  public cardType: CardType[] = [F];
  public hp: number = 190;
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'High Density Armor',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon has full HP, it takes 60 less damage from attacks from your opponent\'s Pokémon (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Tough Swing',
    cost: [F, F, C, C],
    damage: 150,
    text: 'This attack\'s damage isn\'t affected by Resistance.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Steelix';
  public fullName: string = 'Steelix M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // High Density Armor
    if (effect instanceof DealDamageEffect && effect.target.getPokemonCard() === this) {
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (IS_ABILITY_BLOCKED(store, state, targetPlayer, this)) {
        return state;
      }

      if (effect.target.damage === 0) {
        effect.damage = Math.max(0, effect.damage - 60);
      }
    }

    // Hard Swing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    return state;
  }
}
