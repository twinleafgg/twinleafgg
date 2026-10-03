import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, PlayerType, GameMessage, AttachEnergyPrompt, EnergyCard, SlotType, StateUtils, CardList, GameError } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gardevoir extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Kirlia';

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 140;

  public weakness = [{ type: CardType.METAL }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Shining Arcana',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may look at the top 2 cards ' +
      'of your deck and attach any number of basic Energy ' +
      'cards you find there to your Pokémon in any way you' +
      'like. Put the other cards into your hand.'
  }];

  public attacks = [
    {
      name: 'Brainwave',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: 'This attack does 30 more damage for each [P] Energy ' +
        'attached to this Pokémon.'
    }
  ];

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '61';

  public regulationMark = 'E';

  public name: string = 'Gardevoir';

  public fullName: string = 'Gardevoir CRE';

  public readonly SHINING_ARCANA_MARKER = 'SHINING_ARCANA_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.SHINING_ARCANA_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.SHINING_ARCANA_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.SHINING_ARCANA_MARKER, this);
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach(em => {
        energyCount += em.provides.filter(cardType =>
          cardType === CardType.PSYCHIC || cardType === CardType.ANY
        ).length;
      });
      effect.damage += energyCount * 30;
    }

    if (WAS_POWER_USED(effect, 0, this)) {

      const player = effect.player;
      const temp = new CardList();

      if (player.marker.hasMarker(this.SHINING_ARCANA_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      MOVE_CARDS(store, state, player.deck, temp, { count: 2, sourceCard: this });

      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter(card => {
        return card instanceof EnergyCard && card.energyType === EnergyType.BASIC;
      });

      // If no energy cards were drawn, move all cards to hand
      if (energyCardsDrawn.length == 0) {
        player.marker.addMarker(this.SHINING_ARCANA_MARKER, this);
        temp.cards.slice(0, 2).forEach(card => {
          MOVE_CARDS(store, state, temp, player.hand, { cards: [card], sourceCard: this });
        });
      }

      if (energyCardsDrawn.length > 0) {

        // Prompt to attach energy if any were drawn
        return store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          temp, // Only show drawn energies
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: energyCardsDrawn.length, allowCancel: false }
        ), transfers => {

          //if transfers = 0, put both in hand

          if (transfers.length === 0) {
            temp.cards.slice(0, 2).forEach(card => {
              MOVE_CARDS(store, state, temp, player.hand, { cards: [card], sourceCard: this });
              player.marker.addMarker(this.SHINING_ARCANA_MARKER, this);
            });
          }

          // Attach energy based on prompt selection
          if (transfers) {
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this }); // Move card to target
            }
            temp.cards.forEach(card => {
              MOVE_CARDS(store, state, temp, player.hand, { cards: [card], sourceCard: this }); // Move card to hand
              player.marker.addMarker(this.SHINING_ARCANA_MARKER, this);
            });
          }
        });
      }
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return state;
    }
    return state;
  }
}
