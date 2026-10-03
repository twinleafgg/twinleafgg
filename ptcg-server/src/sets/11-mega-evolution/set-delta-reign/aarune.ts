import {
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  BLOCK_IF_DECK_EMPTY,
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';

export class Aarune extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark: string = 'J';
  public set: string = 'M6';
  public setNumber: string = '68';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Aarune';
  public fullName: string = 'Aarune M6';
  public text: string =
    'Search your deck for up to 3 Supporter or Stadium cards in any combination, reveal them, and put them into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      BLOCK_IF_DECK_EMPTY(player);

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        const isSupporter = c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
        const isStadium = c instanceof TrainerCard && c.trainerType === TrainerType.STADIUM;
        if (!(isSupporter || isStadium)) {
          blocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 3, allowCancel: false, blocked },
        ),
        (cards) => {
          cards = cards || [];

          if (cards.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
            MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this });
          }

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [effect.trainerCard],
            sourceCard: this,
          });
          return SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}
