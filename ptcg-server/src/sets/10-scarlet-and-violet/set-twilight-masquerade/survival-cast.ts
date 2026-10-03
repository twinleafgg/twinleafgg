import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { State, StateUtils, GameLog, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {DAMAGED_FROM_FULL_HP, IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

// interface PokemonItem {
//   playerNum: number;
//   cardList: PokemonCardList;
// }

export class SurvivalCast extends TrainerCard {
  public regulationMark = 'H';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  protected _tags = [CardTag.ACE_SPEC];

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '164';

  public name = 'Survival Brace';

  public fullName = 'Survival Brace TWM';

  public text: string =
    "If the Pokémon this card is attached to has full HP and would be Knocked Out by damage from an opponent's attack, that Pokémon is not Knocked Out and its remaining HP becomes 10 instead. Then, discard this card.";

  public reduceEffect(store: any, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (
        IS_TOOL_BLOCKED(store, state, player, this) ||
        !DAMAGED_FROM_FULL_HP(store, state, effect, player, effect.target)
      ) {
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
