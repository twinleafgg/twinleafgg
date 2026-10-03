import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, PlayerType, SlotType, MoveEnergyPrompt, CardTarget } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Serperior extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Servine';
  public cardType: CardType[] = [G];
  public hp: number = 130;
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Royal Heal',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'At any times between turns, heal 10 damage from each of your Pokemon.'
  }];

  public attacks = [
    {
      name: 'Leaf Tornado',
      cost: [G, C],
      damage: 60,
      text: 'Move as many [G] Energy attached to your Pokemon to your other Pokemon in any way you like.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '125';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Serperior';
  public fullName: string = 'Serperior DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Royal Heal - Between turns healing
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;

      let hasSerperior = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          if (!IS_ABILITY_BLOCKED(store, state, player, this)) {
            hasSerperior = true;
          }
        }
      });

      if (hasSerperior) {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.damage > 0) {
            cardList.damage = Math.max(0, cardList.damage - 10);
          }
        });
      }
    }

    // Attack: Leaf Tornado - Move Grass Energy around
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        const blocked: number[] = [];
        cardList.cards.forEach((c, index) => {
          if (c.superType === SuperType.ENERGY) {
            const energyMap = checkProvidedEnergy.energyMap.find(em => em.card === c);
            if (!energyMap || (!energyMap.provides.includes(CardType.GRASS) && !energyMap.provides.includes(CardType.ANY))) {
              blocked.push(index);
            }
          }
        });

        if (blocked.length > 0) {
          blockedMap.push({ source: target, blocked });
        }
      });

      let hasGrassEnergy = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        checkProvidedEnergy.energyMap.forEach(em => {
          if (em.provides.includes(CardType.GRASS) || em.provides.includes(CardType.ANY)) {
            hasGrassEnergy = true;
          }
        });
      });

      if (!hasGrassEnergy) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, blockedMap }
      ), transfers => {
        if (transfers === null) {
          return;
        }

        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}
