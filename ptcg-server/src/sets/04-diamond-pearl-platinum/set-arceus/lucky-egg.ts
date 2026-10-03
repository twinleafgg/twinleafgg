import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  IS_TOOL_BLOCKED,
} from '../../../game/store/prefabs/prefabs';

import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class LuckyEgg extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'AR';
  public name: string = 'Lucky Egg';
  public fullName: string = 'Lucky Egg AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';

  public text: string =
    "When the Pokémon this card is attached to is Knocked Out by damage from an opponent's attack, draw cards until you have 7 cards in your hand.";

  public damageDealt = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttackEffect && effect.player.active.tools.includes(this)) {
      this.damageDealt = false;
    }

    if (
      (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) &&
      effect.target.tools.includes(this)
    ) {
      const player = StateUtils.getOpponent(state, effect.player);

      if (player.active.tools.includes(this)) {
        this.damageDealt = true;
      }
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player === StateUtils.getOpponent(state, effect.player)
    ) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (owner === effect.player) {
        this.damageDealt = false;
      }
    }

    if (effect instanceof KnockOutEffect && effect.target.tools.includes(this)) {
      const player = effect.player;

      // const target = effect.target;
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (this.damageDealt) {
        DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 7);
      }

      return state;
    }

    return state;
  }
}
