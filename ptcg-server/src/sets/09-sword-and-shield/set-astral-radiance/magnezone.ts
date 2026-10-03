import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, StateUtils, AttachEnergyPrompt, CardList, EnergyCard, GameMessage, PlayerType, SlotType, ShuffleDeckPrompt, GameError, ShowCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {IS_ABILITY_BLOCKED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magnezone extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Magneton';

  public cardType: CardType[] = [CardType.METAL];

  public hp: number = 150;

  public weakness = [{ type: CardType.FIRE }];

  public resistance = [{ type: CardType.GRASS, value: -30 }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Giga Magnet',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may look at the top 6 cards of your deck and attach any number of [M] Energy cards you find there to your Pokémon in any way you like. Shuffle the other cards back into your deck.'
  }];

  public attacks = [{
    name: 'Power Beam',
    cost: [CardType.METAL, CardType.COLORLESS, CardType.COLORLESS],
    damage: 120,
    text: ''
  }];

  public regulationMark = 'F';

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '107';

  public name: string = 'Magnezone';

  public fullName: string = 'Magnezone ASR';

  public readonly GIGA_MAGNET_MARKER = 'GIGA_MAGNET_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.GIGA_MAGNET_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.GIGA_MAGNET_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const temp = new CardList();

      if (player.marker.hasMarker(this.GIGA_MAGNET_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length == 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Look at top 6 cards
      MOVE_CARDS(store, state, player.deck, temp, { count: 6, sourceCard: this });

      // Filter for Metal Energy cards
      const metalEnergyCards = temp.cards.filter(card =>
        card instanceof EnergyCard &&
        card.name === 'Metal Energy'
      );

      if (metalEnergyCards.length === 0) {
        // If no Metal Energy found, return all cards to deck and shuffle
        // Show the cards to the player first
        return store.prompt(state, new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS,
          temp.cards
        ), () => {
          MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
            return state;
          });
        });
      }

      // Prompt to attach Metal Energy cards
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        temp,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, name: 'Metal Energy' },
        { min: 0, max: metalEnergyCards.length }
      ), transfers => {
        if (transfers) {
          // Attach selected energy cards
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, temp, target, { cards: [transfer.card], sourceCard: this });
          }
        }

        player.marker.addMarker(this.GIGA_MAGNET_MARKER, this);
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        // Return remaining cards to deck and shuffle
        MOVE_CARDS(store, state, temp, player.deck, { sourceCard: this });
        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
          return state;
        });
      });
    }
    return state;
  }
}