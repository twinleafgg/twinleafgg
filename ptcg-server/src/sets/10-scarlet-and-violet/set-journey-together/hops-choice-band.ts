import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';

import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class HopsChoiceBand extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  protected _tags = [CardTag.HOPS];

  public set: string = 'JTG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '148';

  public regulationMark = 'I';

  public name: string = "Hop's Choice Band";

  public fullName: string = "Hop's Choice Band JTG";

  public text: string =
    "Attacks used by the Hop's Pokémon this card is attached to cost [C] less and do 30 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.player.active.tools.includes(this)) {
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

      const hopsPokemon = effect.player.active.getPokemonCard();

      if (hopsPokemon && hopsPokemon.hasTag(CardTag.HOPS)) {
        effect.cost.splice(index, 1);
      }

      return state;
    }

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

      if (effect.target !== opponent.active) return state;

      const sourceCard = effect.source.getPokemonCard();
      if (sourceCard && sourceCard.hasTag(CardTag.HOPS)) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
