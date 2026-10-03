import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  GameError,
  ChooseCardsPrompt,
  Player,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class SabrinasSuggestion extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'TEU';
  public setNumber: string = '154';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Sabrina's Suggestion";
  public fullName: string = "Sabrina's Suggestion TEU";
  public text: string =
    'Your opponent reveals their hand. You may choose a Supporter card you find there and use the effect of that card as the effect of this card. You may play only 1 Supporter card during your turn (before your attack).';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    if (player.supporterTurn > 0) {
      return false;
    }
    if (opponent.hand.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const supporterCards = opponent.hand.cards.filter(
        (c) => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER,
      );

      if (supporterCards.length === 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
          opponent.hand,
          { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
          { min: 0, max: 1, allowCancel: true },
        ),
        (selected) => {
          selected = selected || [];
          if (selected.length === 0) {
            return;
          }

          const trainerCard = selected[0] as TrainerCard;
          // Sabrina already counted as this turn's Supporter; the copy must still resolve.
          const originalSupporterTurn = player.supporterTurn;
          player.supporterTurn = 0;
          try {
            store.reduceEffect(state, new TrainerEffect(player, trainerCard));
          } finally {
            player.supporterTurn = originalSupporterTurn;
          }
        },
      );
    }

    return state;
  }
}
