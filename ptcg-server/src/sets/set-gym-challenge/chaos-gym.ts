import { Effect } from '../../game/store/effects/effect';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StateUtils } from '../../game/store/state-utils';
import {
  PlayItemEffect,
  PlaySupporterEffect,
  TrainerEffect,
} from '../../game/store/effects/play-card-effects';
import {
  ADD_MARKER,
  COIN_FLIP_PROMPT,
  CONFIRMATION_PROMPT,
  HAS_MARKER,
  MOVE_CARD_TO,
} from '../../game/store/prefabs/prefabs';
import { GameMessage } from '../../game';

export class ChaosGym extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;

  public set: string = 'G2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '102';
  public name: string = 'Chaos Gym';
  public fullName: string = 'Chaos Gym G2';

  public text: string =
    "Whenever a player plays a Trainer card other than a Stadium card, he or she flips a coin. If heads, that player plays that card normally. If tails, the player can't play that card. If the card isn't put into play, the player's opponent may use that card instead, if he or she does everything required in order to play that card (like discarding cards).Either way, the card goes to its owner's discard pile.";

  public readonly CHAOS_GYM_MARKER = 'CHAOS_GYM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      (effect instanceof PlayItemEffect || effect instanceof PlaySupporterEffect) &&
      StateUtils.getStadiumCard(state) === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // avoid recursion if Chaos Gym is already in effect
      if (HAS_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard)) {
        return state;
      }

      effect.preventDefault = true;
      MOVE_CARD_TO(state, effect.trainerCard, player.supporter);

      // Add a marker to the player to indicate that Chaos Gym is in effect
      ADD_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard, this);

      // Flip a coin to see if the player can play the Trainer card
      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          const playTrainerEffect = new TrainerEffect(player, effect.trainerCard);
          store.reduceEffect(state, playTrainerEffect);
        } else {
          // Just can't use if put into play
          if (
            effect.trainerCard.putIntoPlay ||
            effect.trainerCard.trainerType === TrainerType.TOOL
          ) {
            MOVE_CARD_TO(state, effect.trainerCard, player.discard);
            return state;
          }
          // If tails, opponent can use the Trainer card if they want
          CONFIRMATION_PROMPT(
            store,
            state,
            opponent,
            (result) => {
              if (result) {
                const playTrainerEffect = new TrainerEffect(opponent, effect.trainerCard);
                store.reduceEffect(state, playTrainerEffect);
              }
            },
            GameMessage.WANT_TO_USE_ABILITY,
          );
        }
      });
      // Regardless of the outcome, the Trainer card goes to the discard pile
      MOVE_CARD_TO(state, effect.trainerCard, player.discard);
      // Remove the Chaos Gym marker after resolving (idk how to do this)
    }

    return state;
  }
}

// import { Effect } from '../../game/store/effects/effect';
// import { State } from '../../game/store/state/state';
// import { StoreLike } from '../../game/store/store-like';
// import { TrainerCard } from '../../game/store/card/trainer-card';
// import { TrainerType } from '../../game/store/card/card-types';
// import { StateUtils } from '../../game/store/state-utils';
// import { PlayItemEffect, PlaySupporterEffect, TrainerEffect } from '../../game/store/effects/play-card-effects';
// import { ADD_MARKER, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, HAS_MARKER, MOVE_CARD_TO, REMOVE_MARKER } from '../../game/store/prefabs/prefabs';
// import { GameMessage } from '../../game';

// export class ChaosGym extends TrainerCard {
//   protected _trainerType: TrainerType = TrainerType.STADIUM;
//   public set: string = 'G2';
//   public cardImage: string = 'assets/cardback.png';
//   public setNumber: string = '102';
//   public name: string = 'Chaos Gym';
//   public fullName: string = 'Chaos Gym G2';

//   public text: string =
//     'Whenever a player plays a Trainer card other than a Stadium card, he or she flips a coin. If heads, that player plays that card normally. If tails, the player can\'t play that card. If the card isn\'t put into play, the player\'s opponent may use that card instead, if he or she does everything required in order to play that card (like discarding cards).Either way, the card goes to its owner\'s discard pile.';

//   public readonly CHAOS_GYM_MARKER = 'CHAOS_GYM_MARKER';

//   public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

//     if ((effect instanceof PlayItemEffect || effect instanceof PlaySupporterEffect) && StateUtils.getStadiumCard(state) === this) {
//       const player = effect.player;
//       const opponent = StateUtils.getOpponent(state, player);

//       // avoid recursion if Chaos Gym is already in effect
//       if (HAS_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard)) {
//         return state;
//       }

//       effect.preventDefault = true;
//       MOVE_CARD_TO(state, effect.trainerCard, player.supporter);

//       // Add a marker to the player to indicate that Chaos Gym is in effect
//       ADD_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard, this);

//       // Flip a coin to see if the player can play the Trainer card
//       COIN_FLIP_PROMPT(store, state, player, result => {
//         if (result) {
//           const playTrainerEffect = new TrainerEffect(player, effect.trainerCard);
//           store.reduceEffect(state, playTrainerEffect);
//           // Remove the Chaos Gym marker after resolving
//           REMOVE_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard, this);
//           // Move the Trainer card to the discard pile
//           MOVE_CARD_TO(state, effect.trainerCard, player.discard);
//         } else {
//           // Just can't use if put into play
//           if (effect.trainerCard.putIntoPlay) {
//             MOVE_CARD_TO(state, effect.trainerCard, player.discard);
//             REMOVE_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard, this);
//             return state;
//           }
//           // If tails, opponent can use the Trainer card if they want
//           CONFIRMATION_PROMPT(store, state, opponent, result => {
//             if (result) {
//               const playTrainerEffect = new TrainerEffect(opponent, effect.trainerCard);
//               store.reduceEffect(state, playTrainerEffect);
//             }
//             // After opponent's choice, remove marker and discard
//             REMOVE_MARKER(this.CHAOS_GYM_MARKER, effect.trainerCard, this);
//             MOVE_CARD_TO(state, effect.trainerCard, player.discard);
//           }, GameMessage.WANT_TO_USE_ABILITY);
//         }
//       });
//     }

//     return state;
//   }
// }
