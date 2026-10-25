import { CardType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, SpecialCondition, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect, UseAttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Snorlax2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Bad Sleeping Habits',
    powerType: PowerType.POKEBODY,
    text: 'As long as Snorlax is Asleep, your opponent\'s Active Pokémon can\'t retreat.'
  }];

  public attacks = [{
    name: 'Toss and Turn',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If Snorlax is Asleep, this attack does 20 damage plus 30 more damage. (This attack can be used even if Snorlax is Asleep.)'
  },
  {
    name: 'Heavy Press',
    cost: [C, C, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 40 damage plus 40 more damage. If tails, Snorlax is now Asleep.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Snorlax';
  public fullName: string = 'Snorlax RR2';

  public readonly TOSS_AND_TURN_ASLEEP_MARKER = 'TOSS_AND_TURN_ASLEEP_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bad Sleeping Habits
    if (effect instanceof RetreatEffect) {
      const retreatingPlayer = effect.player;
      const owner = StateUtils.getOpponent(state, retreatingPlayer);
      if (owner.active.getPokemonCard() !== this) {
        return state;
      }
      if (!owner.active.specialConditions.includes(SpecialCondition.ASLEEP)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
    }

    // Toss and Turn can be used while Asleep
    if (effect instanceof UseAttackEffect
      && effect.attack === this.attacks[0]
      && effect.player.active.getPokemonCard() === this
      && effect.player.active.specialConditions.includes(SpecialCondition.ASLEEP)) {
      effect.player.active.removeSpecialCondition(SpecialCondition.ASLEEP);
      effect.player.active.marker.addMarker(this.TOSS_AND_TURN_ASLEEP_MARKER, this);
    }

    // Toss and Turn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.active.marker.hasMarker(this.TOSS_AND_TURN_ASLEEP_MARKER, this)) {
        effect.damage += 30;
        effect.player.active.addSpecialCondition(SpecialCondition.ASLEEP);
        effect.player.active.marker.removeMarker(this.TOSS_AND_TURN_ASLEEP_MARKER, this);
      }
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.marker.hasMarker(this.TOSS_AND_TURN_ASLEEP_MARKER, this)) {
          cardList.addSpecialCondition(SpecialCondition.ASLEEP);
          cardList.marker.removeMarker(this.TOSS_AND_TURN_ASLEEP_MARKER, this);
        }
      });
    }

    // Heavy Press
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 40;
        } else {
          ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.player, this);
        }
      });
    }

    return state;
  }
}
