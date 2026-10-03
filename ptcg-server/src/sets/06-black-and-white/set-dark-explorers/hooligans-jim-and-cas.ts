import { GameError, GameMessage, StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {
  COIN_FLIP_PROMPT,
  SHUFFLE_CARDS_INTO_DECK,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';

export class HooligansJimAndCas extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'DEX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Hooligans Jim & Cas';
  public fullName: string = 'Hooligans Jim & Cas DEX';

  public text: string =
    "Flip a coin. If heads, choose 3 random cards from your opponent's hand. " +
    'Your opponent reveals those cards and shuffles them into his or her deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      return COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result && opponent.hand.cards.length > 0) {
          // Select up to 3 random cards from opponent's hand
          const cardsToShuffle = Math.min(3, opponent.hand.cards.length);
          const selectedCards: typeof opponent.hand.cards = [];
          const handCopy = [...opponent.hand.cards];

          for (let i = 0; i < cardsToShuffle; i++) {
            const randomIndex = Math.floor(Math.random() * handCopy.length);
            selectedCards.push(handCopy[randomIndex]);
            handCopy.splice(randomIndex, 1);
          }

          // Show the selected cards to both players
          return store.prompt(
            state,
            [
              new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, selectedCards),
              new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                selectedCards,
              ),
            ],
            () => {
              // Shuffle the selected cards into opponent's deck
              SHUFFLE_CARDS_INTO_DECK(store, state, opponent, selectedCards);
            },
          );
        }
      });
    }

    return state;
  }
}
