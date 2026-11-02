import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, GamePhase, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { KnockOutEffect, PowerEffect } from '../../../game/store/effects/game-effects';

export class Gengar extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Haunter';
  public cardType: CardType[] = [P];
  public hp: number = 130;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Last Gift',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is Knocked Out by damage from an attack from your opponent\'s Pokémon, search your deck for up to 2 cards and put them into your hand. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Pain Burst',
    cost: [C, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'This attack does 40 more damage for each damage counter on your opponent\'s Active Pokémon.'
  }];

  public set: string = 'CRE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar CRE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Last Gift
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      // i love checking for ability lock woooo
      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }

      if (player.deck.cards.length === 0) {
        return state;
      }

      store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, { name: player.name, card: this.name });

      CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) { return state; }

        SEARCH_DECK_FOR_CARDS_TO_HAND(store, state, player, this, {}, { min: 0, max: 2, allowCancel: false }, this.powers[0]);
      });
    }

    // Pain Burst
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      effect.damage += 4 * opponent.active.damage;
    }

    return state;
  }
}