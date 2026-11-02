import { CardType, GamePhase, PlayerType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { ADD_MARKER, HAS_MARKER, IS_POKEBODY_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Nidoking extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Nidorino';
  public hp: number = 130;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Territoriality',
    powerType: PowerType.POKEBODY,
    text: 'If your Active Pokémon is damaged by an opponent\'s attack (even if that Pokémon is Knocked Out), put 2 damage counters on the Attacking Pokémon. You can\'t put more than 2 damage counters in this way.'
  }];

  public attacks = [{
    name: 'Fling Away',
    cost: [C, C, C],
    damage: 60,
    text: 'If your opponent has any Benched Pokémon, this attack\'s base damage is 30 instead of 60 and this attack does 30 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Giga Horn',
    cost: [F, C, C, C],
    damage: 100,
    text: 'Flip 2 coins. If both of them are tails, this attack does nothing.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Nidoking';
  public fullName: string = 'Nidoking RR';

  public readonly TERRITORIALITY_MARKER = 'TERRITORIALITY_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Territoriality
    if (effect instanceof AfterDamageEffect && effect.damage > 0 && state.phase === GamePhase.ATTACK) {
      const damagedOwner = StateUtils.findOwner(state, effect.target);
      if (damagedOwner === effect.player || effect.target !== damagedOwner.active) {
        return state;
      }

      let nidokingInPlay = false;
      damagedOwner.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          nidokingInPlay = true;
        }
      });
      if (!nidokingInPlay || IS_POKEBODY_BLOCKED(store, state, damagedOwner, this)) {
        return state;
      }
      if (HAS_MARKER(this.TERRITORIALITY_MARKER, effect.source, this)) {
        return state;
      }

      ADD_MARKER(this.TERRITORIALITY_MARKER, effect.source, this);
      store.reduceEffect(state, new PlaceDamageCountersEffect(damagedOwner, effect.source, 20, this, this.powers[0]));
    }

    if (effect instanceof EndTurnEffect) {
      REMOVE_MARKER(this.TERRITORIALITY_MARKER, effect.player.active, this);
      const opponent = StateUtils.getOpponent(state, effect.player);
      REMOVE_MARKER(this.TERRITORIALITY_MARKER, opponent.active, this);
    }

    // Fling Away
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.bench.some(b => b.cards.length > 0)) {
        effect.damage = 30;
        THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(30, effect, store, state);
      }
    }

    // Giga Horn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.every(r => !r)) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
