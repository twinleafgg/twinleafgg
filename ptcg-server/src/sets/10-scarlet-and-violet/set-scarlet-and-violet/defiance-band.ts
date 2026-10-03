import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class DefianceBand extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'G';

  public set: string = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '169';

  public name: string = 'Defiance Band';

  public fullName: string = 'Defiance Band SVI';

  public text: string =
    "If you have more Prize cards remaining than your opponent, the attacks of the Pokémon this card is attached to do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.source.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
        return state;
      }

      if (effect.target !== player.active && effect.target !== opponent.active) {
        return state;
      }

      if (effect.damage > 0 && effect.target === opponent.active) {
        effect.damage += 30;
      }
    }
    return state;
  }
}
