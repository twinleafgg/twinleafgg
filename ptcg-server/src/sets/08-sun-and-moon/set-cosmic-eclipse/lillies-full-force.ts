import { ChooseCardsPrompt, GameMessage } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  ADD_MARKER,
  DRAW_CARDS,
  HAS_MARKER,
  MOVE_CARDS,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class LilliesFullForce extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '196';
  public name: string = "Lillie's Full Force";
  public fullName: string = "Lillie's Full Force CEC";
  public text: string = `Draw 4 cards.

At the end of this turn, if you have 3 or more cards in your hand, shuffle cards from your hand into your deck until you have 2 cards in your hand. `;

  public readonly LILLIES_FORCE_MARKER = 'LILLIES_FORCE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      DRAW_CARDS(store, state, effect.player, 4);
      ADD_MARKER(this.LILLIES_FORCE_MARKER, effect.player, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      HAS_MARKER(this.LILLIES_FORCE_MARKER, effect.player, this)
    ) {
      if (effect.player.hand.cards.length >= 3) {
        const shuffleAmount = effect.player.hand.cards.length - 2;

        state = store.prompt(
          state,
          new ChooseCardsPrompt(
            effect.player,
            GameMessage.CHOOSE_CARD_TO_SHUFFLE,
            effect.player.hand,
            {},
            { min: shuffleAmount, max: shuffleAmount, allowCancel: false },
          ),
          (selected) => {
            const cards = selected || [];

            MOVE_CARDS(store, state, effect.player.hand, effect.player.deck, {
              cards,
              sourceCard: this,
            });
            SHUFFLE_DECK(store, state, effect.player);
          },
        );
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.LILLIES_FORCE_MARKER, this);

    return state;
  }
}
