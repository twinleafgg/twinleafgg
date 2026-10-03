import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import {
  StoreLike,
  State,
  GameMessage,
  AttachEnergyPrompt,
  CardList,
  EnergyCard,
  PlayerType,
  SlotType,
  StateUtils,
  ShowCardsPrompt,
  ChooseCardsPrompt,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class KyuremVMAX extends PokemonCard {
  public stage: Stage = Stage.VMAX;

  protected _tags = [CardTag.POKEMON_VMAX];

  public evolvesFrom = 'Kyurem V';

  public cardType: CardType[] = [CardType.WATER];

  public hp = 330;

  public weakness = [{ type: CardType.METAL }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Glaciated World',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may discard the top card of your deck. If that card is a [W] Energy card, attach it to 1 of your Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Max Frost',
      cost: [CardType.WATER, CardType.WATER, CardType.WATER],
      damage: 120,
      damageCalculation: '+',
      text: 'You may discard any amount of [W] Energy from this Pokémon. This attack does 50 more damage for each card you discarded in this way.',
    },
  ];

  public set: string = 'LOR';

  public regulationMark = 'F';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '49';

  public name: string = 'Kyurem VMAX';

  public fullName: string = 'Kyurem VMAX LOR';

  public readonly GLACIATED_WORLD_MARKER = 'GLACIATED_WORLD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.GLACIATED_WORLD_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.GLACIATED_WORLD_MARKER, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Prompt player to choose cards to discard
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.active,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

          // Calculate damage
          const damage = cards.length * 50;
          effect.damage += damage;
          return state;
        },
      );
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const temp = new CardList();

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.GLACIATED_WORLD_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      MOVE_CARDS(store, state, player.deck, temp, { count: 1, sourceCard: this });

      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter((card) => {
        return (
          card instanceof EnergyCard &&
          card.energyType === EnergyType.BASIC &&
          card.name === 'Water Energy'
        );
      });

      // If no energy cards were drawn, move all cards to discard
      if (energyCardsDrawn.length == 0) {
        player.marker.addMarker(this.GLACIATED_WORLD_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        temp.cards.slice(0, 1).forEach((card) => {
          store.prompt(
            state,
            [new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, temp.cards)],
            () => {
              MOVE_CARDS(store, state, temp, player.discard, { sourceCard: this });
            },
          );
        });
      } else {
        // Prompt to attach energy if any were drawn
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            temp, // Only show drawn energies
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH, SlotType.ACTIVE],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 0, max: energyCardsDrawn.length, allowCancel: false },
          ),
          (transfers) => {
            player.marker.addMarker(this.GLACIATED_WORLD_MARKER, this);

            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
              if (cardList.getPokemonCard() === this) {
                cardList.addBoardEffect(BoardEffect.ABILITY_USED);
              }
            });

            // Attach energy based on prompt selection
            if (transfers) {
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this }); // Move card to target
              }
              temp.cards.forEach((card) => {
                MOVE_CARDS(store, state, temp, player.hand, { cards: [card], sourceCard: this }); // Move card to hand
              });
            }
          },
        );
      }
    }
    return state;
  }
}
