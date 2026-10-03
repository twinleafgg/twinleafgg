import { ChooseCardsPrompt, GameError, GameMessage, PokemonCard } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HolonAdventurer extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.DELTA_SPECIES];
  public set: string = 'HP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = 'Holon Adventurer';
  public fullName: string = 'Holon Adventurer HP';

  public text: string = `Discard a card from your hand. If you can't discard a card from your hand, you can't play this card.
  
  Draw 3 cards. If you discarded a Pokémon that has δ on its card, draw 4 cards instead.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (
        player.hand.cards.filter((c) => c !== effect.trainerCard).length < 1 ||
        player.deck.cards.length === 0
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          effect.player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: false, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          let cardsToDraw = 3;

          if (cards[0] instanceof PokemonCard && cards[0].hasTag(CardTag.DELTA_SPECIES)) {
            cardsToDraw = 4;
          }

          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

          DRAW_CARDS(store, state, player, cardsToDraw);
        },
      );
      return state;
    }

    return state;
  }
}
