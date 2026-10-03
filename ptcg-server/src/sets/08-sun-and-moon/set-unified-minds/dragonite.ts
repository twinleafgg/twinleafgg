import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, EnergyCard, GameError, GameMessage, PlayerType, AttachEnergyPrompt, SlotType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Dragonite extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Dragonair';
  public cardType: CardType[] = [N];
  public hp: number = 160;
  public weakness = [{ type: Y }];
  public retreat = [C, C];

  public powers = [{
    name: 'Hurricane Charge',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may attach a [W] Energy card, a [L] Energy card, or 1 of each from your hand to your Pokémon in any way you like.'
  }];

  public attacks = [{
    name: 'Dragon Impact',
    cost: [W, L, C, C],
    damage: 170,
    text: 'Discard 3 Energy from this Pokémon.'
  }];

  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '151';
  public name: string = 'Dragonite';
  public fullName: string = 'Dragonite UNM';

  public readonly HURRICANE_CHARGE_MARKER = 'HURRICANE_CHARGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.HURRICANE_CHARGE_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.HURRICANE_CHARGE_MARKER, this)) {
      effect.player.marker.removeMarker(this.HURRICANE_CHARGE_MARKER, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 3);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.hand.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && (c.provides.includes(CardType.WATER) || (c.provides.includes(CardType.LIGHTNING)));
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.HURRICANE_CHARGE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const blocked: number[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        checkProvidedEnergy.energyMap.forEach((em, index) => {
          if (!(em.provides.includes(CardType.WATER) || em.provides.includes(CardType.LIGHTNING))) {
            const globalIndex = cardList.cards.indexOf(em.card);
            if (globalIndex !== -1 && !blocked.includes(globalIndex)) {
              blocked.push(globalIndex);
            }
          }
        });
      });

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        {
          allowCancel: false,
          min: 1,
          max: 2,
          blocked,
          differentTypes: true,
          validCardTypes: [CardType.WATER, CardType.LIGHTNING]
        },
      ), transfers => {
        transfers = transfers || [];

        player.marker.addMarker(this.HURRICANE_CHARGE_MARKER, this);

        if (transfers.length === 0) {
          return state;
        }

        if (transfers.length > 1) {
          if (transfers[0].card.name === transfers[1].card.name) {
            throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
          }
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });
        }
      });
    }
    return state;
  }
}