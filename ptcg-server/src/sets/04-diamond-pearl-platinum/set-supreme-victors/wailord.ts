import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { HealTargetEffect, RemoveSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wailord extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wailmer';
  public hp: number = 180;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Rest',
    cost: [C, C],
    damage: 0,
    text: 'Remove all Special Conditions and 4 damage counters from Wailord. Wailord is now Asleep.'
  }, {
    name: 'Giant Wave',
    cost: [W, W, W, C, C],
    damage: 100,
    text: 'Wailord can\'t use Giant Wave during your next turn.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '47';
  public name: string = 'Wailord';
  public fullName: string = 'Wailord SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rest
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const healTargetEffect = new HealTargetEffect(effect, 40);
      healTargetEffect.target = player.active;
      store.reduceEffect(state, healTargetEffect);
      const removeSpecialCondition = new RemoveSpecialConditionsEffect(effect, undefined);
      removeSpecialCondition.target = player.active;
      store.reduceEffect(state, removeSpecialCondition);
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, player, this);
    }

    // Giant Wave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[1]);
    }

    return state;
  }
}
