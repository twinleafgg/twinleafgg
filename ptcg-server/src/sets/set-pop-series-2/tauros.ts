import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Tauros extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    // Rage
    name: 'Rage',
    cost: [C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 10 more damage for each damage counter on Tauros.'
  }, {
    // Take Down
    name: 'Take Down',
    cost: [C, C, C],
    damage: 40,
    text: 'Tauros does 10 damage to itself.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Tauros';
  public fullName: string = 'Tauros P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage += effect.player.active.damage;
    }
    // Take Down
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }
    return state;
  }
}
