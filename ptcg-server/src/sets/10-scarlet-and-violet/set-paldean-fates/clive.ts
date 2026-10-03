import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError, GameMessage, Player, ShowCardsPrompt, StateUtils } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Clive extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '78';

  public set = 'PAF';

  public name = 'Clive';

  public fullName = 'Clive PAF';

  public text: string =
    'Your opponent reveals their hand. Draw 2 cards for each Supporter card you find there.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const cardsInOpponentHand = opponent.hand.cards.filter(
        (card) => card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER,
      );

      state = store.prompt(
        state,
        new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          opponent.hand.cards,
        ),
        () => {
          const cardsToMove = cardsInOpponentHand.length * 2;
          MOVE_CARDS(store, state, player.deck, player.hand, {
            count: cardsToMove,
            sourceCard: this,
          });
        },
      );
    }
    return state;
  }
}
