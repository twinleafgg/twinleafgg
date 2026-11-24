import {
  CardList,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
  Player,
  CardTag,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class HisuianHeavyBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public regulationMark = 'F';
  public set: string = 'ASR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '146';
  public name: string = 'Hisuian Heavy Ball';
  public fullName: string = 'Hisuian Heavy Ball ASR';
  public text: string =
    "Look at your face-down Prize cards. You may reveal a Basic Pokémon you find there, put it into your hand, and put this Hisuian Heavy Ball in its place as a face-down Prize card. (If you don't reveal a Basic Pokémon, put this card in the discard pile.) Then, shuffle your face-down Prize cards.";

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    let faceDownCheck = 0;
    player.prizes.forEach((card) => {
      if (card.isSecret) {
        faceDownCheck++;
      }
    });
    if (!faceDownCheck) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
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
          SHOW_CARDS_TO_PLAYER(store, state, opponent, chosenPrize);

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
