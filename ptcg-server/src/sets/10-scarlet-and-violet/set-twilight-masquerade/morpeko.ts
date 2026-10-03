import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, CardList, GameError, GameMessage, PlayerType, AttachEnergyPrompt, EnergyCard, SlotType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ConfirmCardsPrompt } from '../../../game/store/prompts/confirm-cards-prompt';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Morpeko extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public regulationMark = 'H';

  public cardType: CardType[] = [CardType.LIGHTNING];

  public hp: number = 70;

  public weakness = [{ type: CardType.FIGHTING }];

  public resistance = [];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Snack Seek',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may look at the top card of your deck. You may discard that card.'
    }
  ];

  public attacks = [
    {
      name: 'Pick and Stick',
      cost: [CardType.LIGHTNING],
      damage: 0,
      text: 'Attach up to 2 Basic Energy cards from your discard pile to your Pokémon in any way you like.'
    }
  ];

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '72';

  public name: string = 'Morpeko';

  public fullName: string = 'Morpeko TWM';

  public readonly SNACK_SEARCH_MARKER = 'SNACK_SEARCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.SNACK_SEARCH_MARKER, this)) {
      effect.player.marker.removeMarker(this.SNACK_SEARCH_MARKER, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      player.marker.removeMarker(this.SNACK_SEARCH_MARKER, this);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.SNACK_SEARCH_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 1, sourceCard: this });
      player.marker.addMarker(this.SNACK_SEARCH_MARKER, this);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return store.prompt(state, new ConfirmCardsPrompt(
        player.id,
        GameMessage.DISCARD_FROM_TOP_OF_DECK,
        deckTop.cards, // Fix error by changing toArray() to cards
        { allowCancel: true },
      ), selected => {

        if (selected !== null) {
          // Discard card
          MOVE_CARDS(store, state, deckTop, player.discard, { cards: deckTop.cards, sourceCard: this });
        } else {

          // Move back to the top of your deck
          deckTop.moveToTopOfDestination(player.deck);

        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC;
      });
      if (!hasEnergyInDiscard) {
        return state;
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 1, max: 2 }
      ), transfers => {
        transfers = transfers || [];
        // cancelled by user
        if (transfers.length === 0) {
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });

      return state;
    }
    return state;
  }
}