import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  PokemonCard,
  StoreLike,
  State,
  StateUtils,
  TrainerCard,
} from '../../../game';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class BeastBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'CES';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '125';
  public name: string = 'Beast Ball';
  public fullName: string = 'Beast Ball CES';

  public text: string =
    "Look at your face-down Prize cards. You may reveal an Ultra Beast card you find there, put it into your hand, and put this Beast Ball in its place. (If you don't reveal an Ultra Beast card, put this card in the discard pile.) Then, shuffle your face-down Prize cards.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Need at least 1 face-down Prize card
    return player.prizes.some((p) => p.isSecret);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const prizes = player.prizes.filter((p) => p.isSecret);

      // Keep track of which prizes were originally face down
      const originallyFaceDown = player.prizes.map((p) => p.isSecret);

      // If there are no face-down prizes, this card can't be played
      if (prizes.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Make prizes no longer secret before displaying prompt
      prizes.forEach((p) => {
        p.isSecret = false;
      });

      // Prevent default effect and move the trainer card to the supporter area
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // Gather all prize cards for the prompt
      const allPrizeCards = new CardList();
      player.prizes.forEach((prizeList) => {
        allPrizeCards.cards.push(...prizeList.cards);
      });

      // Build blocked list for non-Ultra Beast cards
      const blocked: number[] = [];
      allPrizeCards.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || !card.hasTag(CardTag.ULTRA_BEAST)) {
          blocked.push(index);
        }
      });

      // Prompt the player to choose an Ultra Beast from their prizes
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          allPrizeCards,
          {},
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (chosenPrize) => {
          // Handle the case where no Ultra Beast is chosen
          if (!chosenPrize || chosenPrize.length === 0) {
            player.prizes.forEach((p, index) => {
              if (originallyFaceDown[index]) {
                p.isSecret = true;
              }
            });
            this.shuffleFaceDownPrizeCards(
              player.prizes.filter((p, index) => originallyFaceDown[index]),
            );
            return state;
          }

          const prizeUltraBeast = chosenPrize[0];
          const chosenPrizeList = player.prizes.find((prizeList) =>
            prizeList.cards.includes(prizeUltraBeast),
          );

          // Show the chosen Ultra Beast to the opponent
          SHOW_CARDS_TO_PLAYER(store, state, opponent, chosenPrize);

          // Move the chosen Ultra Beast to the player's hand & move the Beast Ball to the prize cards
          if (chosenPrizeList) {
            MOVE_CARDS(store, state, chosenPrizeList, player.hand, {
              cards: [prizeUltraBeast],
              sourceCard: this,
            });
            MOVE_CARDS(store, state, player.supporter, chosenPrizeList, {
              cards: [effect.trainerCard],
              sourceCard: this,
            });
          }

          // Reset the face-down prizes
          player.prizes.forEach((p, index) => {
            if (originallyFaceDown[index]) {
              p.isSecret = true;
            }
          });

          // Shuffle only the face-down prize cards
          this.shuffleFaceDownPrizeCards(
            player.prizes.filter((p, index) => originallyFaceDown[index]),
          );

          return state;
        },
      );
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
