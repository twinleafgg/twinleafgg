import { ShuffleDeckPrompt } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

import { MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class StadiumNav extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'UNM';
  public name: string = 'Stadium Nav';
  public fullName: string = 'Stadium Nav UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '208';

  public text: string =
    'Flip 2 coins. For each heads, search your deck for a Stadium card, reveal it, and put it into your hand. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const opponent = StateUtils.getOpponent(state, player);

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      effect.preventDefault = true;

      let heads: number = 0;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (results) => {
        results.forEach((r) => {
          heads += r ? 1 : 0;
        });

        if (heads === 0) {
          return state;
        }

        let cards: Card[] = [];

        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          // eslint-disable-next-line no-empty
          if (card instanceof TrainerCard && card.trainerType === TrainerType.STADIUM) {
          } else {
            blocked.push(index);
          }
        });

        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM },
            { min: 0, max: heads, allowCancel: false, blocked },
          ),
          (selected) => {
            cards = selected || [];

            if (cards.length > 0) {
              MOVE_CARDS(store, state, player.deck, player.hand, {
                cards: cards,
                sourceCard: this,
              });

              return store.prompt(
                state,
                new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                () => {
                  return state;
                },
              );
            }

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          },
        );
      });
    }

    return state;
  }
}
