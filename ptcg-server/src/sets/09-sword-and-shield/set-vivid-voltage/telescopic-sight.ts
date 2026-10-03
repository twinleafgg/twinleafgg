import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class TelescopicSight extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'VIV';
  public setNumber = '160';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Telescopic Sight';
  public fullName: string = 'Telescopic Sight VIV';
  public text: string =
    "The attacks of the Pokémon this card is attached to do 30 more damage to your opponent's Benched Pokémon V and Benched Pokémon-GX.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.source.tools.includes(this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const target = effect.target.getPokemonCard();

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (
        effect.damage > 0 &&
        effect.target !== opponent.active &&
        target &&
        (target.hasTag(CardTag.POKEMON_GX) ||
          target.hasTag(CardTag.POKEMON_V) ||
          target.hasTag(CardTag.POKEMON_VMAX) ||
          target.hasTag(CardTag.POKEMON_VSTAR) ||
          target.hasTag(CardTag.POKEMON_VUNION))
      ) {
        effect.damage += 30;
      }
    }
    return state;
  }
}
