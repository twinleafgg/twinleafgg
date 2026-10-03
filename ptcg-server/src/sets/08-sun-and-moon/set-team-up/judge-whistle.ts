import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  SelectPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class JudgeWhistle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'TEU';
  public name: string = 'Judge Whistle';
  public fullName: string = 'Judge Whistle TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '146';

  public text: string = `Choose 1:

  • Draw a card.
  • Put a Judge card from your discard pile into your hand.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      let isJudgeInDiscard = false;
      player.discard.cards.forEach((card) => {
        if (card instanceof TrainerCard && card.name === 'Judge') {
          isJudgeInDiscard = true;
        }
      });

      if (!isJudgeInDiscard && player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // if there's no judge, just draw
      if (!isJudgeInDiscard) {
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      }

      if (isJudgeInDiscard) {
        const options: { message: GameMessage; action: () => void }[] = [
          {
            // grab a judge
            message: GameMessage.CHOOSE_SUPPORTER_FROM_DISCARD,
            action: () => {
              const blocked: number[] = [];
              player.discard.cards.forEach((c, index) => {
                const isJudge = c instanceof TrainerCard && c.name === 'Judge';
                if (isJudge) {
                  return;
                } else {
                  blocked.push(index);
                }
              });

              let cards: Card[] = [];

              store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_HAND,
                  player.discard,
                  { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                  { min: 1, max: 1, allowCancel: false, blocked },
                ),
                (selected) => {
                  cards = selected || [];
                  MOVE_CARDS(store, state, player.discard, player.hand, {
                    cards: cards,
                    sourceCard: this,
                  });

                  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                    player.deck.applyOrder(order);
                  });
                },
              );
            },
          },
          {
            message: GameMessage.DRAW,
            action: () => {
              MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
            },
          },
        ];

        return store.prompt(
          state,
          new SelectPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            options.map((opt) => opt.message),
            { allowCancel: false },
          ),
          (choice) => {
            const option = options[choice];
            option.action();
          },
        );
      }
    }

    return state;
  }
}
