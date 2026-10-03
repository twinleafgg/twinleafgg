import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  ShuffleDeckPrompt,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HelperBell extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '165';
  public regulationMark = 'H';
  public name: string = 'Call Bell';
  public fullName: string = 'Helper Bell SSP';

  public text: string = `You can use this card only if you go second, and only on your first turn.

Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (state.turn !== 2) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      // Get current turn
      const turn = state.turn;

      // Check if it is player's first turn
      if (turn !== 2) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      } else {
        const player = effect.player;
        effect.preventDefault = true;
        MOVE_CARDS(store, state, player.hand, player.supporter, {
          cards: [effect.trainerCard],
          sourceCard: this,
        });

        if (player.deck.cards.length === 0) {
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }

        // We will discard this card after prompt confirmation
        effect.preventDefault = true;

        let cards: Card[] = [];
        return store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
            { min: 0, max: 1, allowCancel: false },
          ),
          (selectedCards) => {
            cards = selectedCards || [];

            cards.forEach((card, index) => {
              MOVE_CARDS(store, state, player.deck, player.hand, {
                cards: [card],
                sourceCard: this,
              });
            });

            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: [this],
              sourceCard: this,
            });

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          },
        );
      }
    }
    return state;
  }
}
