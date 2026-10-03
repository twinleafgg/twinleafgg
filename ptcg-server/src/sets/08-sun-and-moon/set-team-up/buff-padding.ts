import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class BuffPadding extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'TEU';

  public setNumber: string = '136';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Buff Padding';

  public fullName: string = 'Buff Padding TEU';

  public text: string =
    'If the Pokémon this card is attached to has a Retreat Cost of exactly 4, it gets +50 HP.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckHpEffect && effect.target.tools.includes(this)) {
      const sourceCard = effect.target.getPokemonCard();

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const toolEffect = new ToolEffect(effect.player, this);
        store.reduceEffect(state, toolEffect);
      } catch {
        return state;
      }

      if (!sourceCard || sourceCard.retreat.length !== 4) {
        return state;
      }
      effect.hp += 50;
    }
    return state;
  }
}
