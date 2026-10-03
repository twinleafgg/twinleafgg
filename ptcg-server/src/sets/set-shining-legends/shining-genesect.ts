import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, BoardEffect } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PlayerType, SlotType, MoveEnergyPrompt, CardTarget, PowerType, Card, GameError, EnergyCard } from '../../game';

import { Effect } from '../../game/store/effects/effect';
import { GameMessage } from '../../game/game-message';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ShiningGenesect extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 130;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Energy Reload',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may move a [G] Energy from 1 of your other Pokémon to this Pokémon.'
  }];

  public attacks = [
    {
      name: 'Gaia Blaster',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      text: 'This attack does 20 more damage times the amount of [G] Energy attached to this Pokémon.'
    },
  ];

  public set: string = 'SLG';

  public name: string = 'Shining Genesect';

  public fullName: string = 'Shining Genesect SLG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '9';

  public readonly ENERGY_RELOAD_MARKER = 'ENERGY_RELOAD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.ENERGY_RELOAD_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.ENERGY_RELOAD_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let pokemonCount = 0;
      let otherPokemonWithEnergy = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card !== this) {
          pokemonCount += 1;
          const hasAttachedEnergy = cardList.cards.some(c => c.superType === SuperType.ENERGY && ((c as EnergyCard).provides.includes(CardType.GRASS) || (c as EnergyCard).provides.includes(CardType.ANY)));
          otherPokemonWithEnergy = otherPokemonWithEnergy || hasAttachedEnergy;
        }
      });

      if (pokemonCount <= 1 && !otherPokemonWithEnergy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        const blockedCards: Card[] = [];

        checkProvidedEnergy.energyMap.forEach(em => {
          if (!em.provides.includes(CardType.GRASS) && !em.provides.includes(CardType.ANY)) {
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

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.getPokemonCard() !== this) {
          blockedTo.push(target);
        } else {
          blockedFrom.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        effect.player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blockedMap, blockedFrom, blockedTo }
      ), transfers => {
        if (transfers === null) {
          return;
        }
        player.marker.addMarker(this.ENERGY_RELOAD_MARKER, this);
        for (const transfer of transfers) {

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }

        return state;
      });
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.ENERGY_RELOAD_MARKER, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Check attached energy
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkEnergy);

      // Count total FIRE energy provided
      const totalGrassEnergy = checkEnergy.energyMap.reduce((sum, energy) => {
        return sum + energy.provides.filter(type => type === CardType.GRASS || type === CardType.ANY).length;
      }, 0);

      effect.damage += totalGrassEnergy * 20;
    }
    return state;
  }
}
