import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { Player, ShuffleDeckPrompt } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cassiopeia extends TrainerCard {
  public regulationMark = 'H';
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Cassiopeia';
  public fullName: string = 'Cassiopeia SFA';

  public text: string = `You can play this card only when it is the last card in your hand.

Search your deck for up to 2 cards and put them into your hand. Then, shuffle your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const otherHand = player.hand.cards.filter((c) => c !== this);
    if (otherHand.length !== 0 || player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const cards = player.hand.cards.filter((c) => c !== this);
      const hasEffect = player.deck.cards.length > 0;

      if (cards.length !== 0 || !hasEffect) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 2, allowCancel: false },
        ),
        (cards) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    return state;
  }
}
