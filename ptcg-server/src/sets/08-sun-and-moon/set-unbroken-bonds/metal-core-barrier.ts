import { PlayerType } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import { StateUtils } from '../../../game/store/state-utils';
import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class MetalCoreBarrier extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'UNB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '180';

  public name: string = 'Metal Core Barrier';

  public fullName: string = 'Metal Core Barrier UNB';

  public text: string =
    "If this card is attached to 1 of your Pokémon, discard it at the end of your opponent's turn. The [M] Pokémon this card is attached to takes 70 less damage from your opponent's attacks (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      // Discard card at the end of opponent's turn
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            cardList.tools.includes(this) &&
            StateUtils.findOwner(state, cardList) !== effect.player
          ) {
            // Check if tool is blocked before discarding
            if (!IS_TOOL_BLOCKED(store, state, StateUtils.findOwner(state, cardList), this)) {
              MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
            }
          }
        });
      });
    }

    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonType);

      if (!checkPokemonType.cardTypes.includes(CardType.METAL)) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);

      // Check if damage target is owned by this card's owner
      const targetPlayer = StateUtils.findOwner(state, effect.target);
      if (targetPlayer === player) {
        effect.reduceDamage(70);
      }

      return state;
    }
    return state;
  }
}
