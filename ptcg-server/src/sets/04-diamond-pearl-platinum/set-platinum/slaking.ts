import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER, HAS_MARKER, IS_POKEBODY_BLOCKED, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Slaking extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Vigoroth';
  public hp: number = 150;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +30 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Lazy Paunch',
    powerType: PowerType.POKEBODY,
    text: 'If Slaking used any attacks during your last turn, Slaking can\'t attack.'
  }];

  public attacks = [{
    name: 'Best Dash',
    cost: [C, C, C, C],
    damage: 150,
    text: 'During your opponent\'s next turn, any damage done to Slaking by attacks is increased by 50 (after applying Weakness and Resistance).'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Slaking';
  public fullName: string = 'Slaking PL';

  public readonly USED_ATTACK_MARKER = 'USED_ATTACK_MARKER';
  public readonly CANT_ATTACK_MARKER = 'CANT_ATTACK_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lazy Paunch
    if (effect instanceof AttackEffect && effect.source.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)
        && HAS_MARKER(this.CANT_ATTACK_MARKER, effect.player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.USED_ATTACK_MARKER, effect.player, this);
      effect.player.active.damageReductionNextTurn = -50;
    }

    if (effect instanceof EndTurnEffect) {
      const usedThisTurn = HAS_MARKER(this.USED_ATTACK_MARKER, effect.player, this);
      REMOVE_MARKER(this.USED_ATTACK_MARKER, effect.player, this);
      REMOVE_MARKER(this.CANT_ATTACK_MARKER, effect.player, this);
      if (usedThisTurn) {
        ADD_MARKER(this.CANT_ATTACK_MARKER, effect.player, this);
      }
    }

    return state;
  }
}
