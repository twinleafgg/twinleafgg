import { Card, ChooseCardsPrompt, GameError, GameMessage } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Delinquent extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BKP';

  public name: string = 'Delinquent';

  public fullName: string = 'Delinquent BKP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '98';

  public text: string =
    'Discard any Stadium card in play. If you do, your opponent discards 3 cards from his or her hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      // const opponentCards = opponent.hand.cards;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const stadiumCard = StateUtils.getStadiumCard(state);

      if (stadiumCard == undefined) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [this], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      if (stadiumCard !== undefined) {
        // Discard Stadium
        const cardList = StateUtils.findCardList(state, stadiumCard);
        const player = StateUtils.findOwner(state, cardList);
        MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
      }

      // Discard 3 cards from opponent's hand

      const opponentCards = opponent.hand.cards.filter((c) => c !== this);
      if (opponentCards.length <= 3) {
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { sourceCard: this });
      }

      if (opponentCards.length > 3) {
        let cards: Card[] = [];

        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            opponent,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.hand,
            {},
            { min: 3, max: 3, allowCancel: false },
          ),
          (selected) => {
            cards = selected || [];
            MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards, sourceCard: this });
          },
        );
      }
    }
    return state;
  }
}
