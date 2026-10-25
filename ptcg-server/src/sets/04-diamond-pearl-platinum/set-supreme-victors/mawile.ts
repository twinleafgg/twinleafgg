import { PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mawile extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Turnaround Standby',
    cost: [M],
    damage: 0,
    text: 'During your next turn, any damage done by Mawile\'s Swallow or Bite to your opponent\'s Active Pokémon is increased by 40 (before applying Weakness and Resistance).'
  }, {
    name: 'Swallow',
    cost: [C, C],
    damage: 20,
    text: 'Remove from Mawile the number of damage counters equal to the damage you did to the Defending Pokémon.'
  }, {
    name: 'Bite',
    cost: [C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Mawile';
  public fullName: string = 'Mawile SV';

  public readonly DURING_OPPONENTS_NEXT_TURN = 'DURING_OPPONENTS_NEXT_TURN';
  public readonly MAWILE_BONUS_TURN = 'MAWILE_BONUS_TURN';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Turnaround Standby
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.DURING_OPPONENTS_NEXT_TURN, effect.player, this);
    }

    // Swallow / Bite +40 during the bonus turn
    if (WAS_ATTACK_USED(effect, 1, this) || WAS_ATTACK_USED(effect, 2, this)) {
      if (HAS_MARKER(this.MAWILE_BONUS_TURN, effect.player, this)) {
        effect.damage += 40;
      }
    }

    // Swallow: heal damage dealt
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[1] && effect.damage > 0
      && effect.player.active.getPokemonCard() === this) {
      store.reduceEffect(state, new HealEffect(effect.player, effect.player.active, effect.damage));
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (HAS_MARKER(this.DURING_OPPONENTS_NEXT_TURN, opponent, this)) {
        REMOVE_MARKER(this.DURING_OPPONENTS_NEXT_TURN, opponent, this);
        ADD_MARKER(this.MAWILE_BONUS_TURN, opponent, this);
      }
      if (HAS_MARKER(this.MAWILE_BONUS_TURN, player, this)) {
        REMOVE_MARKER(this.MAWILE_BONUS_TURN, player, this);
      }
    }

    return state;
  }
}
