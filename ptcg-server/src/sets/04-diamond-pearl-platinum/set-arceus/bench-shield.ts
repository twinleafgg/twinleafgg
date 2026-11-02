import { State, StateUtils, StoreLike } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class BenchShield extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Bench Shield';
  public fullName: string = 'Bench Shield AR';
  public text: string = 'Attach Bench Shield to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. As long as the Pokémon this card is attached to is on your Bench, prevent all damage done to that Pokémon by attacks (both yours and your opponent\'s).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if ((effect instanceof PutDamageEffect || effect instanceof DealDamageEffect) && effect.target.tools.includes(this)) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (effect.target === owner.active) {
        return state;
      }
      if (IS_TOOL_BLOCKED(store, state, owner, this)) {
        return state;
      }
      effect.preventDefault = true;
    }

    return state;
  }
}
