import { PlayerType } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class LumBerry extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'EM';
  public name: string = 'Lum Berry';
  public fullName: string = 'Lum Berry EM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';

  public text: string =
    'At the end of each turn, if the Pokémon this card is attached to is affected by any Special Conditions, it recovers from all of them, and discard this card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      // Handle Lum Berry for player's Active Pokémon
      if (player.active.cards.includes(this) && player.active.specialConditions.length > 0) {
        player.active.specialConditions.slice().forEach((condition) => {
          player.active.removeSpecialCondition(condition);
        });
        // Discard Lum Berry after use
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
          if (cardList.tools && cardList.tools.includes(this)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      }

      // Handle Lum Berry for opponent's Active Pokémon
      if (opponent.active.cards.includes(this) && opponent.active.specialConditions.length > 0) {
        opponent.active.specialConditions.slice().forEach((condition) => {
          opponent.active.removeSpecialCondition(condition);
        });
        // Discard Lum Berry after use
        opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
          if (cardList.tools && cardList.tools.includes(this)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      }
    }

    return state;
  }
}
