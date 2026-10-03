import { Card, ChooseCardsPrompt, GameError, GameLog, GameMessage } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LostBlender extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '181';

  public name: string = 'Lost Blender';

  public fullName: string = 'Lost Blender LOT';

  public text: string = 'Put 2 cards from your hand in the Lost Zone. If you do, draw a card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.hand.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let cards: Card[] = [];

      cards = player.hand.cards;

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: 2, max: 2, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];

          // Operation canceled by the user
          if (cards.length === 0) {
            return state;
          }

          MOVE_CARDS(store, state, player.hand, player.lostzone, {
            cards: cards,
            sourceCard: this,
          });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });

          store.log(state, GameLog.LOG_PLAYER_DRAWS_CARD, { name: player.name });
        },
      );
    }
    return state;
  }
}
