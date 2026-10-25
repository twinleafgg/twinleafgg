import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GamePhase, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../../game/store/prefabs/attack-effects';
import { ADD_MARKER, HAS_MARKER, IS_POKEBODY_BLOCKED, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Rampardos extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Cranidos';
  public hp: number = 130;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +30 }];
  public retreat = [C];

  public powers = [{
    name: 'Iron Skull',
    powerType: PowerType.POKEBODY,
    text: 'Rampardos\'s attack\'s damage isn\'t affected by Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.'
  }];

  public attacks = [{
    name: 'Head Smash',
    cost: [F],
    damage: 80,
    text: 'If the Defending Pokémon would be Knocked Out by this attack, Rampardos does 40 damage to itself.'
  }, {
    name: 'Mold Breaker',
    cost: [F, C],
    damage: 40,
    text: 'Any damage done to Rampardos by attacks is reduced by 20 (after applying Weakness and Resistance) until the end of your next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Rampardos';
  public fullName: string = 'Rampardos PL';

  public readonly MOLD_BREAKER_MARKER = 'MOLD_BREAKER_MARKER';
  public readonly MOLD_BREAKER_CLEAR_MARKER = 'MOLD_BREAKER_CLEAR_MARKER';

  public usedHeadSmash = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Iron Skull
    if ((WAS_ATTACK_USED(effect, 0, this) || WAS_ATTACK_USED(effect, 1, this))
      && !IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, effect.damage);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedHeadSmash = true;
    }

    // Head Smash — self-damage if the Defending Pokémon is KO'd
    if (effect instanceof KnockOutEffect && this.usedHeadSmash) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (effect.player !== owner
        && owner.active.getPokemonCard() === this
        && state.phase === GamePhase.ATTACK) {
        owner.active.damage += 40;
      }
    }

    // Mold Breaker
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_MARKER(this.MOLD_BREAKER_MARKER, effect.player, this);
      REMOVE_MARKER(this.MOLD_BREAKER_CLEAR_MARKER, effect.player, this);
    }

    if (effect instanceof PutDamageEffect && effect.target.cards.includes(this)) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (HAS_MARKER(this.MOLD_BREAKER_MARKER, owner, this)) {
        effect.damage = Math.max(0, effect.damage - 20);
      }
    }

    if (effect instanceof EndTurnEffect) {
      if (effect.player.active.getPokemonCard() === this || HAS_MARKER(this.MOLD_BREAKER_MARKER, effect.player, this)) {
        this.usedHeadSmash = false;
      }
      if (HAS_MARKER(this.MOLD_BREAKER_MARKER, effect.player, this)) {
        if (HAS_MARKER(this.MOLD_BREAKER_CLEAR_MARKER, effect.player, this)) {
          REMOVE_MARKER(this.MOLD_BREAKER_MARKER, effect.player, this);
          REMOVE_MARKER(this.MOLD_BREAKER_CLEAR_MARKER, effect.player, this);
        } else {
          ADD_MARKER(this.MOLD_BREAKER_CLEAR_MARKER, effect.player, this);
        }
      }
    }

    return state;
  }
}
