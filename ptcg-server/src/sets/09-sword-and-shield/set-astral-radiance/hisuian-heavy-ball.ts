import {
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  ShowCardsPrompt,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianHeavyBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'F';

  public set: string = 'ASR';

  public name: string = 'Hisuian Heavy Ball';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '146';

  public fullName: string = 'Hisuian Heavy Ball ASR';

  public text: string =
    "Look at your face-down Prize cards. You may reveal a Basic Pokémon you find there, put it into your hand, and put this Hisuian Heavy Ball in its place as a face-down Prize card. (If you don't reveal a Basic Pokémon, put this card in the discard pile.) Then, shuffle your face-down Prize cards.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const prizes = player.prizes.filter((p) => p.isSecret);

      // Keep track of which prizes were originally face down
      const originallyFaceDown = player.prizes.map((p) => p.isSecret);

      // If there is no prizes originally face down, this card can't be played
      let faceDownCheck = 0;
      player.prizes.forEach((card) => {
        if (card.isSecret) {
          faceDownCheck++;
        }
      });
      if (!faceDownCheck) {
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

      // Prompt the player to choose a Pokémon from their prizes
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          allPrizeCards,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: 1, allowCancel: false },
        ),
        (chosenPrize) => {
          // Handle the case where no Pokémon is chosen
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

          const prizePokemon = chosenPrize[0];
          const chosenPrizeList = player.prizes.find((prizeList) =>
            prizeList.cards.includes(prizePokemon),
          );

          // Show the chosen Pokémon to the opponent
          if (chosenPrize.length > 0) {
            state = store.prompt(
              state,
              new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                chosenPrize,
              ),
              () => {},
            );
          }

          // Move the chosen Pokémon to the player's hand & move the Hisuian Heavy Ball to the prize cards
          if (chosenPrizeList) {
            MOVE_CARDS(store, state, chosenPrizeList, player.hand, {
              cards: [prizePokemon],
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
