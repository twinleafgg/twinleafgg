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

export class Infernape extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom: string = 'Monferno';

  public regulationMark: string = 'H';

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 140;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Pyro Dance',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may attach a Basic [R] Energy card, a Basic [F] Energy card, or 1 of each from your hand to your Pokémon in any way you like.'
  }];

  public attacks = [{
    name: 'Scorching Fire',
    cost: [CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
    damage: 200,
    text: 'Discard an Energy from this Pokémon.'
  }];

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '33';

  public name: string = 'Infernape';

  public fullName: string = 'Infernape TWM';

  public readonly TAR_GENERATOR_MARKER = 'TAR_GENERATOR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.TAR_GENERATOR_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.TAR_GENERATOR_MARKER, this)) {
      effect.player.marker.removeMarker(this.TAR_GENERATOR_MARKER, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.hand.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && (c.provides.includes(CardType.FIGHTING) || (c.provides.includes(CardType.FIRE)));
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.TAR_GENERATOR_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const blocked: number[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        checkProvidedEnergy.energyMap.forEach((em, index) => {
          if (!(em.provides.includes(CardType.FIGHTING) || em.provides.includes(CardType.FIRE)) || em.provides.includes(CardType.ANY)) {
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
          validCardTypes: [CardType.FIRE, CardType.FIGHTING]
        },
      ), transfers => {
        transfers = transfers || [];

        player.marker.addMarker(this.TAR_GENERATOR_MARKER, this);

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