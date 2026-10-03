import { Effect } from '../../game/store/effects/effect';
import { GameMessage } from '../../game/game-message';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../game/store/card/card-types';
import { StateUtils, ShowCardsPrompt, ShuffleDeckPrompt, GameError } from '../../game';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Lass extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '75';

  public name: string = 'Lass';

  public fullName: string = 'Lass BS';

  public text: string =
    'You and your opponent show each other your hands, then shuffle all the Trainer cards from your hands into your decks.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Exclude Lass itself from hand checks (if needed)
      const playerHandWithoutLass = player.hand.cards.filter((c) => c !== this);
      const opponentHand = opponent.hand.cards;

      // If both hands are empty, do nothing
      if (playerHandWithoutLass.length === 0 && opponentHand.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Helper to move all Trainer cards from hand to deck using MOVE_CARDS
      const moveTrainersToDeck = (store: StoreLike, state: State, hand: any, deck: any) => {
        const trainers = hand.cards.filter((c: any) => c.superType === SuperType.TRAINER);
        if (trainers.length > 0) {
          state = MOVE_CARDS(store, state, hand, deck, { cards: trainers, sourceCard: this });
        }
        return state;
      };

      // Show both hands (if not empty), then shuffle trainers, then shuffle decks
      return store.prompt(
        state,
        new ShowCardsPrompt(
          opponent.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          player.hand.cards,
        ),
        () => {
          return store.prompt(
            state,
            new ShowCardsPrompt(
              player.id,
              GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
              opponent.hand.cards,
            ),
            () => {
              // Move Trainer cards from both hands to decks
              state = moveTrainersToDeck(store, state, player.hand, player.deck);
              state = moveTrainersToDeck(store, state, opponent.hand, opponent.deck);

              // Discard Lass (if needed)
              if (player.hand.cards.includes(effect.trainerCard)) {
                state = MOVE_CARDS(store, state, player.hand, player.discard, {
                  cards: [effect.trainerCard],
                  sourceCard: this,
                });
              }

              // Shuffle both decks
              return store.prompt(state, new ShuffleDeckPrompt(player.id), (playerOrder) => {
                player.deck.applyOrder(playerOrder);
                return store.prompt(state, new ShuffleDeckPrompt(opponent.id), (opponentOrder) => {
                  opponent.deck.applyOrder(opponentOrder);
                  return state;
                });
              });
            },
          );
        },
      );
    }
    return state;
  }
}
