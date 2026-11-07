import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { AFTER_ATTACK, SWITCH_IN_OPPONENT_BENCHED_POKEMON } from '../../../game/store/prefabs/prefabs';

export class Druddigon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 120;
  public weakness = [];
  public retreat = [C, C];

  public attacks = [{
    name: 'Drag Off',
    cost: [R, W],
    damage: 0,
    text: 'Switch in 1 of your opponent\'s Benched Pokémon to the Active Spot.This attack does 40 damage to the new Active Pokémon.'
  },
  {
    name: 'Claw Slash',
    cost: [C, C, C],
    damage: 80,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Druddigon';
  public fullName: string = 'Druddigon M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Drag Off
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      return SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, player, {
        allowCancel: false,
        sourceEffect: effect,
        onSwitched: () => {
          const attackEffect = new AttackEffect(player, opponent, effect.attack);
          const damageEffect = new DealDamageEffect(attackEffect, 40);
          damageEffect.target = opponent.active;
          store.reduceEffect(state, damageEffect);
        },
      });
    }

    return state;
  }
}
