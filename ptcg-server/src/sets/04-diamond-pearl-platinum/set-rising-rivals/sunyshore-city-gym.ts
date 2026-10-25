import { State, StateUtils, StoreLike } from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { ApplyWeaknessEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonStatsEffect, CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

export class SunyshoreCityGym extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Sunyshore City Gym';
  public fullName: string = 'Sunyshore City Gym RR';
  public text: string = 'This card stays in play when you play it. Discard this card if another Stadium card comes into play. If another card with the same name is in play, you can\'t play this card. Any damage done by attacks from Lightning Pokémon (both yours and your opponent\'s) to the Defending Pokémon isn\'t affected by Resistance. Each Lightning Pokémon in play (both yours and your opponent\'s) has no Weakness.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (StateUtils.getStadiumCard(state) !== this) {
      return state;
    }

    if (effect instanceof CheckPokemonStatsEffect) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkPokemonType);
      if (checkPokemonType.cardTypes.includes(CardType.LIGHTNING)) {
        effect.weakness = [];
      }
    }

    if (effect instanceof AttackEffect || effect instanceof ApplyWeaknessEffect) {
      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);
      store.reduceEffect(state, checkPokemonType);
      if (checkPokemonType.cardTypes.includes(CardType.LIGHTNING)) {
        effect.ignoreResistance = true;
      }
    }

    return state;
  }
}
