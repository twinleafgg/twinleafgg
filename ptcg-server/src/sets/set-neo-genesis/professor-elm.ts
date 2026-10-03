import { Effect } from '../../game/store/effects/effect';
import {
  TrainerEffect,
  PlayItemEffect,
  PlaySupporterEffect,
  PlayStadiumEffect,
  AttachPokemonToolEffect,
} from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { ShuffleDeckPrompt } from '../../game/store/prompts/shuffle-prompt';
import { GameError, GameMessage } from '../../game';
import {
  ADD_MARKER,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  REMOVE_MARKER_AT_END_OF_TURN,
  MOVE_CARDS,
} from '../../game/store/prefabs/prefabs';

export class ProfessorElm extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public set = 'N1';
  public name = 'Professor Elm';
  public fullName = 'Professor Elm N1';

  public text: string =
    "Shuffle your hand into your deck. Then, draw 7 cards. You can't play any more Trainer cards this turn.";

  public readonly PROFESSOR_ELM_MARKER = 'PROFESSOR_ELM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const cards = player.hand.cards.filter((c) => c !== this);

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      if (cards.length > 0) {
        MOVE_CARDS(store, state, player.hand, player.deck, { cards: cards, sourceCard: this });

        store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
        });
      }

      DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 7);
      ADD_MARKER(this.PROFESSOR_ELM_MARKER, player, this);

      return state;
    }

    if (
      effect instanceof PlayItemEffect ||
      effect instanceof PlaySupporterEffect ||
      effect instanceof AttachPokemonToolEffect ||
      effect instanceof PlayStadiumEffect
    ) {
      const player = effect.player;
      if (player.marker.hasMarker(this.PROFESSOR_ELM_MARKER, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PROFESSOR_ELM_MARKER, this);

    return state;
  }
}
