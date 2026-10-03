import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError, GameMessage, CardList, ChooseCardsPrompt } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SagesTraining extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = "Sage's Training";
  public fullName: string = "Sage's Training CL";

  public text: string =
    'Look at the top 5 cards of your deck. Choose any 2 cards you find there and put them into your hand. Discard the other cards.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && effect.player.ancientSupporter) {
      effect.player.ancientSupporter = false;
    }

    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

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

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      const min = player.deck.cards.length > 1 ? Math.min(2, deckTop.cards.length) : 1;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          deckTop,
          {},
          { min, max: 2, allowCancel: false },
        ),
        (selected) => {
          player.ancientSupporter = true;
          MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
          MOVE_CARDS(store, state, deckTop, player.discard, { sourceCard: this });
        },
      );
    }
    return state;
  }
}
