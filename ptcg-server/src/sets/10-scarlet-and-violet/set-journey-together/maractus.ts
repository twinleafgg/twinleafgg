import { CardType, GamePhase, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect, PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Maractus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 110;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public powers = [{
    name: 'Explosive Needle',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent\'s Pokémon, put 6 damage counters on the Attacking Pokémon.'
  }];

  public attacks = [{
    name: 'Corner',
    cost: [C],
    damage: 20,
    text: 'During your opponent\'s next turn, the Defending Pokémon can\'t retreat.'
  }];

  public set: string = 'JTG';
  public regulationMark: string = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Maractus';
  public fullName: string = 'Maractus JTG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Explosive Needle — Ref: set-pokemon-151/weezing.ts
    if (
      effect instanceof KnockOutEffect &&
      effect.target.cards.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const abilityOwner = effect.player;
      const attackerOwner = StateUtils.getOpponent(state, abilityOwner);

      if (state.phase !== GamePhase.ATTACK ||
        abilityOwner.active.getPokemonCard() !== this ||
        state.players[state.activePlayer] !== attackerOwner
      ) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, abilityOwner, this)) {
        return state;
      }

      store.reduceEffect(
        state,
        new PlaceDamageCountersEffect(abilityOwner, attackerOwner.active, 60, this, this.powers[0]),
      );
    }

    // Corner
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    return state;
  }

}
