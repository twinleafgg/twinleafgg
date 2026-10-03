import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class CounterGain extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'LOT';

  public name: string = 'Counter Gain';

  public fullName: string = 'Counter Gain LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '170';

  public text: string =
    'If you have more Prize cards remaining than your opponent, the attacks of the Pokémon this card is attached to cost [C] less.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const index = effect.cost.indexOf(CardType.COLORLESS);

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      // No cost to reduce
      if (index === -1) {
        return state;
      }

      if (player.getPrizeLeft() > opponent.getPrizeLeft()) {
        effect.cost.splice(index, 1);
      }

      return state;
    }

    return state;
  }
}
