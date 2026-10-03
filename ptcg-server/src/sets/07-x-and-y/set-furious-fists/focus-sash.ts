import { GameLog, PlayerType, StateUtils } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {DAMAGED_FROM_FULL_HP, IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
export class FocusSash extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'FFI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '91';

  public name = 'Focus Sash';

  public fullName = 'Focus Sash FFI';

  public text: string =
    "If the [F] Pokémon this card is attached to has full HP and would be Knocked Out by damage from an opponent's attack, that Pokémon is not Knocked Out and its remaining HP becomes 10 instead. Then, discard this card.";

  public reduceEffect(store: any, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);

      if (
        IS_TOOL_BLOCKED(store, state, player, this) ||
        !DAMAGED_FROM_FULL_HP(store, state, effect, player, effect.target)
      ) {
        return state;
      }

      const checkPokemonTypeEffect = new CheckPokemonTypeEffect(effect.target);
      state = store.reduceEffect(state, checkPokemonTypeEffect);
      if (!checkPokemonTypeEffect.cardTypes.includes(CardType.FIGHTING)) {
        return state;
      }

      effect.surviveOnTenHPReason = this.name;
      store.log(state, GameLog.LOG_PLAYER_PLAYS_TOOL, { card: this.name });

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.tools && cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    return state;
  }
}
