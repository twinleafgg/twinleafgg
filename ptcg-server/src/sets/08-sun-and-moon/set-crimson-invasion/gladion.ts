import {
  Card,
  CardList,
  ChoosePrizePrompt,
  GameError,
  GameMessage,
  State,
  StoreLike,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gladion extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CIN';

  public name: string = 'Gladion';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '95';

  public fullName: string = 'Gladion CIN';

  public text: string =
    "Look at your face-down Prize cards and put 1 of them into your hand. Then, shuffle this Gladion into your remaining Prize cards and put them back face down. If you didn't play this Gladion from your hand, it does nothing.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const prizes = player.prizes.filter((p) => p.isSecret);

      const supporterTurn = player.supporterTurn;

      if (prizes.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const cards: Card[] = [];
      prizes.forEach((p) => {
        p.cards.forEach((c) => cards.push(c));
      });

      const blocked: number[] = [];
      player.prizes.forEach((c, index) => {
        if (!c.isSecret) {
          blocked.push(index);
        }
      });

      // Make prizes no more secret, before displaying prompt
      prizes.forEach((p) => {
        p.isSecret = false;
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      state = store.prompt(
        state,
        new ChoosePrizePrompt(player.id, GameMessage.CHOOSE_PRIZE_CARD, {
          count: 1,
          blocked: blocked,
          allowCancel: false,
        }),
        (chosenPrize) => {
          const selectedPrize = chosenPrize[0];
          const hand = player.hand;
          const gladion = effect.trainerCard;
          MOVE_CARDS(store, state, selectedPrize, hand, { sourceCard: this });

          const chosenPrizeIndex = player.prizes.indexOf(chosenPrize[0]);
          MOVE_CARDS(store, state, player.supporter, player.prizes[chosenPrizeIndex], {
            cards: [gladion],
            sourceCard: this,
          });

          prizes.forEach((p) => {
            p.isSecret = true;
          });
          player.prizes = this.shuffleFaceDownPrizeCards(player.prizes);
        },
      );

      return state;
    }
    return state;
  }

  shuffleFaceDownPrizeCards(array: CardList[]): CardList[] {
    const faceDownPrizeCards = array.filter((p) => p.isSecret && p.cards.length > 0);

    for (let i = faceDownPrizeCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = faceDownPrizeCards[i];
      faceDownPrizeCards[i] = faceDownPrizeCards[j];
      faceDownPrizeCards[j] = temp;
    }

    const prizePositions = [];

    for (let i = 0; i < array.length; i++) {
      if (array[i].cards.length === 0 || !array[i].isSecret) {
        prizePositions.push(array[i]);
        continue;
      }

      prizePositions.push(faceDownPrizeCards.splice(0, 1)[0]);
    }

    return prizePositions;
  }
}
