import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameError, GameMessage, StateUtils, MoveEnergyPrompt, PlayerType, SlotType, PowerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { CardTarget } from '../../../game';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Dewgong extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Seel';
  public cardType: CardType[] = [W];
  public hp: number = 130;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [{
    name: 'Wash Out',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'As often as you like during your turn, you may use this Ability. Move a [W] Energy from 1 of your Benched Pokémon to your Active Pokémon. '
  }];

  public attacks = [{
    name: 'Wave Splash',
    cost: [W, W],
    damage: 60,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Dewgong';
  public fullName: string = 'Dewgong M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if there's any [W] Energy on benched Pokemon
      let hasWaterEnergyOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList !== player.active) {
          const checkEnergy = new CheckProvidedEnergyEffect(player, cardList);
          store.reduceEffect(state, checkEnergy);
          if (checkEnergy.energyMap.some(em => em.provides.includes(CardType.WATER))) {
            hasWaterEnergyOnBench = true;
          }
        }
      });

      if (!hasWaterEnergyOnBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];

      // Block active Pokemon as source
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          blockedFrom.push(target);
        } else {
          blockedTo.push(target);
        }
      });

      // Block bench Pokemon as destination
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList !== player.active) {
          blockedTo.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: 1, blockedFrom, blockedTo }
      ), transfers => {
        if (!transfers || transfers.length === 0) {
          return state;
        }

        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);

          // Verify it's a Water Energy
          const checkEnergy = new CheckProvidedEnergyEffect(player, source);
          store.reduceEffect(state, checkEnergy);
          const energyEntry = checkEnergy.energyMap.find(em => em.card === transfer.card);
          if (!energyEntry || !energyEntry.provides.includes(CardType.WATER)) {
            continue;
          }

          // Move the energy
          if (source.energies.cards.includes(transfer.card)) {
            MOVE_CARDS(store, state, source.energies, target.energies, { cards: [transfer.card], sourceCard: this });
            if (!target.cards.includes(transfer.card)) {
              target.cards.push(transfer.card);
            }
          } else {
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
            if (!target.energies.cards.includes(transfer.card)) {
              target.energies.cards.push(transfer.card);
            }
          }
        }
      });
    }
    return state;
  }
}
