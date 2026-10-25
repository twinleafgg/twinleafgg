import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ABILITY_USED, BLOCK_IF_DECK_EMPTY, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY, REMOVE_MARKER_AT_END_OF_TURN, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Blastoise extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Wartortle';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Dig Well',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may look at the top 3 cards of your deck, choose as many Water Energy cards as you like, and attach them to your Pokémon in any way you like. Discard the other cards. This power can\'t be used if Blastoise is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Aqua Press',
    cost: [W, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Energy attached to all Pokémon (both yours and your opponent\'s).'
  }, {
    name: 'Double Launcher',
    cost: [W, W, C, C],
    damage: 0,
    text: 'Discard 2 Energy attached to Blastoise. Choose 2 of your opponent\'s Benched Pokémon. This attack does 60 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Blastoise can\'t use Double Launcher during your next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Blastoise';
  public fullName: string = 'Blastoise PL';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dig Well
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      BLOCK_IF_DECK_EMPTY(player);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY(store, state, player, 3, 3, {
        energyFilter: { energyType: EnergyType.BASIC, name: 'Water Energy' },
        remainderDestination: 'discard',
      });
    }

    // Aqua Press
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let energyCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        energyCount += checkProvidedEnergy.energyMap.length;
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(opponent, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        energyCount += checkProvidedEnergy.energyMap.length;
      });
      effect.damage += 10 * energyCount;
    }

    // Double Launcher
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
      const benchedCount = opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchedCount > 0) {
        const count = Math.min(2, benchedCount);
        THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(60, effect, store, state, count, count);
      }
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(player, this.attacks[1]);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}
