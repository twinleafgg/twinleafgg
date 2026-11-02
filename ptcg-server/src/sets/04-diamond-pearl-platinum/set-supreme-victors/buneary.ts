import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Buneary extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Bounce',
    cost: [C],
    damage: 0,
    text: 'Switch Buneary with 1 of your Benched Pokémon.'
  }, {
    name: 'Mini Drain',
    cost: [C, C],
    damage: 20,
    text: 'Remove 1 damage counter from Buneary.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Buneary';
  public fullName: string = 'Buneary SV';

  public usedSwitchAttack0 = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bounce
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedSwitchAttack0 = true;
    }

    // Mini Drain
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 10);
    }

    if (effect instanceof AfterAttackEffect && this.usedSwitchAttack0) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
    }

    if (effect instanceof EndTurnEffect) {
      this.usedSwitchAttack0 = false;
    }

    return state;
  }
}
