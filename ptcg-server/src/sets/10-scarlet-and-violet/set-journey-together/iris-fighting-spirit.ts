import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt, GameMessage, Player } from '../../../game';
import { DRAW_CARDS_UNTIL_CARDS_IN_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IrisFightingSpirit extends TrainerCard {
  public regulationMark = 'I';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'JTG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '149';

  public name: string = "Iris's Fighting Spirit";

  public fullName: string = "Iris's Fighting Spirit JTG";

  public text: string =
    'You can use this card only if you discard another card from your hand.' +
    '\n\n' +
    'Draw cards until you have 6 cards in your hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.hand.cards.filter((c) => c !== this).length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: false, min: 0, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
          if (player.hand.cards.length >= 6) {
            return;
          }

          DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);
        },
      );

      return state;
    }
    return state;
  }
}
