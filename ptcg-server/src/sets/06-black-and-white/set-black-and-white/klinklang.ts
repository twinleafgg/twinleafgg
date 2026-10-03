import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PlayerType, SlotType, MoveEnergyPrompt, CardTarget, GameError, GameMessage, Card } from '../../../game';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

function* useShiftGear(next: Function, store: StoreLike, state: State, effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

  // Build blocked map - only allow moving Metal energy
  const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
    const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
    store.reduceEffect(state, checkProvidedEnergy);
    const blockedCards: Card[] = [];

    checkProvidedEnergy.energyMap.forEach(em => {
      if (!em.provides.includes(CardType.METAL) && !em.provides.includes(CardType.ANY)) {
        blockedCards.push(em.card);
      }
    });

    const blocked: number[] = [];
    blockedCards.forEach(bc => {
      const index = cardList.cards.indexOf(bc);
      if (index !== -1 && !blocked.includes(index)) {
        blocked.push(index);
      }
    });

    if (blocked.length !== 0) {
      blockedMap.push({ source: target, blocked });
    }
  });

  return store.prompt(state, new MoveEnergyPrompt(
    effect.player.id,
    GameMessage.MOVE_ENERGY_CARDS,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { superType: SuperType.ENERGY },
    { allowCancel: true, min: 0, max: 1, blockedMap }
  ), transfers => {
    if (transfers === null) {
      return;
    }

    for (const transfer of transfers) {
      const source = StateUtils.getTarget(state, player, transfer.from);
      const target = StateUtils.getTarget(state, player, transfer.to);
      MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: effect.card });
    }
  });
}

export class Klinklang extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Klang';
  public cardType: CardType[] = [M];
  public hp: number = 140;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Shift Gear',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'As often as you like during your turn (before your attack), you may move a [M] Energy from 1 of your Pokémon to another of your Pokémon.'
  }];

  public attacks = [{
    name: 'Gear Saucer',
    cost: [M, M, C],
    damage: 80,
    text: 'Does 20 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Klinklang';
  public fullName: string = 'Klinklang BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shift Gear ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if there's any Metal energy to move
      let hasMetalEnergy = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        checkProvidedEnergy.energyMap.forEach(em => {
          if (em.provides.includes(CardType.METAL) || em.provides.includes(CardType.ANY)) {
            hasMetalEnergy = true;
          }
        });
      });

      if (!hasMetalEnergy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const generator = useShiftGear(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Gear Saucer - damage to benched Pokémon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
    }

    return state;
  }
}
