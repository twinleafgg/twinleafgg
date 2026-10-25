import { PokemonCard, CardType, Stage, EnergyCard, PowerType, State, StateUtils, StoreLike } from '../../game';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../game/store/prefabs/prefabs';

export class Squirtle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [{
    // Shell Retreat
    name: 'Shell Retreat',
    powerType: PowerType.POKEBODY,
    text: 'As long as Squirtle has any Energy cards attached to it, damage done to Squirtle by an opponent\'s attack is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    // Tackle
    name: 'Tackle',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Squirtle';
  public fullName: string = 'Squirtle P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shell Retreat
    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (effect.target.cards.some(c => c instanceof EnergyCard)) {
        effect.damage = Math.max(0, effect.damage - 10);
      }
    }
    return state;
  }
}
