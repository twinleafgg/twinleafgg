import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class PanicMask extends TrainerCard {
  public regulationMark = 'F';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '165';

  public name = 'Panic Mask';

  public fullName = 'Panic Mask LOR';

  public text: string =
    "Prevent all damage done to the Pokémon this card is attached to by attacks from your opponent's Pokémon that have 40 HP or less remaining.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      const attackingPokemon = player.active;
      const maxHp = attackingPokemon.getPokemonCard()?.hp || 0;
      const currentHp = maxHp - attackingPokemon.damage;

      if (currentHp <= 40) {
        effect.damage = 0;
      }
    }

    return state;
  }
}
