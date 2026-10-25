import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { NEXT_TURN_ATTACK_BASE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Swellow extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Taillow';
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public attacks = [{
    // Focus Energy
    name: 'Focus Energy',
    cost: [C],
    damage: 0,
    text: 'During your next turn, Swellow\'s Agility attack\'s base damage is 70.'
  }, {
    // Agility
    name: 'Agility',
    cost: [C, C, C],
    damage: 30,
    text: 'Flip a coin. If heads, prevent all effects of an attack, including damage, done to Swellow during your opponent\'s next turn.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Swellow';
  public fullName: string = 'Swellow P1';

  public readonly FOCUS_ENERGY_MARKER = 'FOCUS_ENERGY_MARKER';
  public readonly FOCUS_ENERGY_CLEAR_MARKER = 'FOCUS_ENERGY_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Focus Energy
    NEXT_TURN_ATTACK_BASE_DAMAGE(effect, {
      setupAttack: this.attacks[0],
      boostedAttack: this.attacks[1],
      source: this,
      baseDamage: 70,
      bonusMarker: this.FOCUS_ENERGY_MARKER,
      clearMarker: this.FOCUS_ENERGY_CLEAR_MARKER,
    });

    // Agility
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
