import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, SpecialCondition } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, StateUtils, CardTarget, PlayerType, MoveEnergyPrompt, SlotType } from '../../../game';
import { GameMessage } from '../../../game/game-message';

import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Armarouge extends PokemonCard {

  public regulationMark = 'G';

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Charcadet';

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 130;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Fire Off',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'As often as you like during your turn, you may move a ' +
      '[R] Energy from 1 of your Benched Pokémon to your Active ' +
      'Pokémon.'
  }];
  public attacks = [{
    name: 'Flame Cannon',
    cost: [CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
    damage: 90,
    text: 'Your opponent\'s Active Pokémon is now Burned.'
  }];
  public set = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '41';

  public name = 'Armarouge';

  public fullName: string = 'Armarouge SVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        const blockedIndices = new Set<number>();
        checkProvidedEnergy.energyMap.forEach(em => {
          if (!em.provides.includes(CardType.FIRE) && !em.provides.includes(CardType.ANY)) {
            const index = cardList.cards.indexOf(em.card);
            if (index !== -1) {
              blockedIndices.add(index);
            }
          }
        });

        if (blockedIndices.size > 0 || target.slot === SlotType.ACTIVE) {
          blockedMap.push({ source: target, blocked: target.slot === SlotType.ACTIVE ? Array.from({ length: cardList.cards.length }, (_, i) => i) : Array.from(blockedIndices) });
        }
      });

      const blockedTargets: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (player.active.getPokemonCard() !== card) {
          blockedTargets.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        effect.player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, blockedMap, blockedTo: blockedTargets }
      ), transfers => {
        if (transfers && transfers.length > 0) {
          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            if (source) {
              const target = player.active; // Always move to active Pokémon
              MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
            }
          }
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.BURNED]);
      store.reduceEffect(state, specialConditionEffect);
    }
    return state;
  }

}
