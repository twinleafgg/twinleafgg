import { Card } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {
  CheckRetreatCostEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import { IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class UTurnBoard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'UNM';

  public name: string = 'U-Turn Board';

  public fullName: string = 'U-Turn Board UNM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '211';

  public readonly U_TURN_BOARD_MARKER = 'U_TURN_BOARD_MARKER';

  public text: string = `The Retreat Cost of the Pokémon this card is attached to is [C] less. 
    
    If this card is discarded from play, put it into your hand instead of the discard pile.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DiscardCardsEffect && effect.cards.includes(this)) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      const cardsToMove = effect.cards.filter((c) => c === this);
      if (cardsToMove.length > 0) {
        state = MOVE_CARDS(store, state, effect.target, player.hand, { cards: cardsToMove });
        effect.cards = effect.cards.filter((c) => c !== this);
      }
    }

    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard === this) {
      const player = effect.player;
      player.marker.addMarker(this.U_TURN_BOARD_MARKER, this);
    }

    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (index !== -1) {
        effect.cost.splice(index, 1);
      }
    }

    if (
      effect instanceof CheckTableStateEffect &&
      state.players.some((p) => p.discard.cards.includes(this))
    ) {
      for (const player of state.players) {
        if (!player.marker.hasMarker(this.U_TURN_BOARD_MARKER, this)) {
          continue;
        }

        const rescued: Card[] = player.marker.markers
          .filter((m) => m.name === this.U_TURN_BOARD_MARKER && m.source !== undefined)
          .map((m) => m.source!);

        const cardsInDiscard = rescued.filter((c) => player.discard.cards.includes(c));

        if (cardsInDiscard.length > 0) {
          state = MOVE_CARDS(store, state, player.discard, player.hand, { cards: cardsInDiscard });
          player.marker.removeMarker(this.U_TURN_BOARD_MARKER, this);
        }
      }
    }
    return state;
  }
}

// if (effect instanceof ToolEffect && effect.player.active.tools.includes(this)) {
//   const player = effect.player;
//   player.marker.addMarker(this.U_TURN_BOARD_MARKER, this);
// }

//     if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
//       const player = effect.player;

//       // Do not activate between turns, or when it's not opponents turn.
//       if (state.phase !== GamePhase.ATTACK) {
//         return state;
//       }

//       const target = effect.target;
//       const cards = target.cards;
//       cards.forEach(card => {
//         player.marker.addMarker(this.U_TURN_BOARD_MARKER, this);
//       });
//     }

//     if (effect instanceof BetweenTurnsEffect) {
//       state.players.forEach(player => {
//         if (!player.marker.hasMarker(this.U_TURN_BOARD_MARKER, this)) {
//           return;
//         }

//         try {
//           const toolEffect = new ToolEffect(player, this);
//           store.reduceEffect(state, toolEffect);
//         } catch {
//           return state;
//         }

//         const rescued: Card[] = player.marker.markers
//           .filter(m => m.name === this.U_TURN_BOARD_MARKER && m.source !== undefined)
//           // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//           .map(m => m.source!); // Add non-null assertion operator

//         MOVE_CARDS(store, state, player.discard, player.hand, { cards: rescued, sourceCard: this });
//         player.marker.removeMarker(this.U_TURN_BOARD_MARKER, this);

//       });
//     }
//     return state;
// }
