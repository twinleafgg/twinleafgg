import { Effect } from '../../game/store/effects/effect';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { GameError, GameMessage, CardList, ChooseCardsPrompt } from '../../game';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class MistysWrath extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'G1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '114';
  public name: string = "Misty's Wrath";
  public fullName: string = "Misty's Wrath G1";

  public text: string =
    'Look at the top 7 cards of your deck. Choose 2 of those cards and put them into your hand. Discard the rest.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 7, sourceCard: this });

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
