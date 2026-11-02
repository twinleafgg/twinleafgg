import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, DEVOLVE_POKEMON, IS_POKEPOWER_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Jolteon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Undevelop',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may devolve Jolteon and put Jolteon into your hand. This power can\'t be used if Jolteon is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Quick Attack',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 30 more damage.'
  }, {
    name: 'Evolving Thunder',
    cost: [L, C],
    damage: 50,
    text: 'If Jolteon evolved from Eevee during this turn, this attack does 10 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon).'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Jolteon';
  public fullName: string = 'Jolteon RR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Undevelop
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      const cardList = StateUtils.findPokemonSlot(state, this);
      if (cardList) {
        DEVOLVE_POKEMON(store, state, cardList, player.hand);
      }
      return state;
    }

    // Quick Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }

    // Evolving Thunder
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.active.pokemonPlayedTurn === state.turn) {
        effect.opponent.bench.forEach(bench => {
          if (bench.cards.length > 0) {
            const damageEffect = new PutDamageEffect(effect, 10);
            damageEffect.target = bench;
            store.reduceEffect(state, damageEffect);
          }
        });
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
