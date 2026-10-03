import { BoardEffect, Card, CardList, CardType, ChooseCardsPrompt, GameError, GameMessage, PlayerType, PokemonCard, PowerType, ShowCardsPrompt, Stage, State, StateUtils, StoreLike, SuperType, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerToDeckEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Florges extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Floette';
  public cardType: CardType[] = [Y];
  public hp: number = 120;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Wondrous Gift',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may flip a coin. If heads, put an Item card from your discard pile on top of your deck.'
  }];

  public attacks = [{
    name: 'Mist Guard',
    cost: [Y, Y, C],
    damage: 70,
    text: 'Prevent all damage done to this Pokémon by attacks from [N] Pokémon during your opponent\'s next turn.'
  }];

  public set: string = 'FLI';
  public setNumber: string = '86';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Florges';
  public fullName: string = 'Florges FLI';

  public readonly WONDROUS_GIFT_MARKER = 'WONDROUS_GIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.marker.hasMarker(this.WONDROUS_GIFT_MARKER, this)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      COIN_FLIP_PROMPT(store, state, player, results => {
        player.marker.addMarker(this.WONDROUS_GIFT_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        if (results === false) {
          return state;
        }

        const deckTop = new CardList();

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
          player.discard,
          { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          cards = selected || [];

          const itemCards = cards.filter(card => card instanceof TrainerCard && card.trainerType === TrainerType.ITEM);
          const nonTrainerCards = cards.filter(card => !(card instanceof TrainerCard));

          let canMoveTrainerCards = true;
          if (itemCards.length > 0) {
            const discardEffect = new TrainerToDeckEffect(player, itemCards[0] as TrainerCard);
            store.reduceEffect(state, discardEffect);
            canMoveTrainerCards = !discardEffect.preventDefault;
          }

          const cardsToMove = canMoveTrainerCards ? cards : nonTrainerCards;

          if (cardsToMove.length > 0) {
            cardsToMove.forEach(card => {
              MOVE_CARDS(store, state, player.discard, deckTop, { cards: [card], sourceCard: this });
            });

            deckTop.moveToTopOfDestination(player.deck);

            if (cardsToMove.length > 0) {
              return store.prompt(state, new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                cardsToMove
              ), () => state);
            }
          }

          return state;
        });
      });
    }

    // Mist Guard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      PREVENT_DAMAGE(store, state, effect, this, { sourceCardTypes: [CardType.DRAGON] });
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.WONDROUS_GIFT_MARKER, this)) {
      effect.player.marker.removeMarker(this.WONDROUS_GIFT_MARKER, this);
    }

    return state;
  }
}
