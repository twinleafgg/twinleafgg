import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { EnergyCard, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hippowdon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Hippopotas';
  public hp: number = 110;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Sand Cover',
    powerType: PowerType.POKEBODY,
    text: 'As long as Hippowdon is your Active Pokémon, put 1 damage counter on each of your opponent\'s Pokémon LV.X between turns.'
  }];

  public attacks = [{
    name: 'Save Sand',
    cost: [C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Energy attached to Hippowdon. Before doing damage, you may search your discard pile for a Fighting Energy card and attach it to Hippowdon.'
  }, {
    name: 'Groundquake',
    cost: [F, F, C, C],
    damage: 80,
    text: 'Does 10 damage to each Benched Pokémon that isn\'t an Evolved Pokémon (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon).'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Hippowdon';
  public fullName: string = 'Hippowdon RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sand Cover
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this || IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        if (card.hasTag(CardTag.POKEMON_LV_X)) {
          store.reduceEffect(state, new PlaceDamageCountersEffect(player, cardList, 10, this, this.powers[0]));
        }
      });
    }

    // Save Sand
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const applyDamageBonus = () => {
        const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
        store.reduceEffect(state, checkEnergy);
        const energyCount = checkEnergy.energyMap.reduce((sum, e) => sum + e.provides.length, 0);
        effect.damage = 20 + (energyCount * 10);
      };

      const hasFightingEnergy = player.discard.cards.some(
        c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fighting Energy',
      );
      if (!hasFightingEnergy) {
        applyDamageBonus();
        return state;
      }

      return ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(store, state, player, 1, F, {
        destinationSlots: [SlotType.ACTIVE],
        energyFilter: { energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        min: 0,
        allowCancel: true,
        onAttached: () => applyDamageBonus(),
      });
    }

    // Groundquake
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const damageUnevolvedBench = (slot: typeof player.bench[number]) => {
        if (slot.cards.length > 0 && slot.getPokemons().length <= 1) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = slot;
          store.reduceEffect(state, damageEffect);
        }
      };
      opponent.bench.forEach(damageUnevolvedBench);
      player.bench.forEach(damageUnevolvedBench);
    }

    return state;
  }
}
