import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hariyama extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Makuhita';
  public hp: number = 110;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Push Out',
    cost: [F, C, C],
    damage: 50,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Vortex Chop',
    cost: [F, F, C, C],
    damage: 60,
    text: 'If the Defending Pokémon has any Resistance, this attack\'s base damage is 120 instead of 60.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Hariyama';
  public fullName: string = 'Hariyama AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Push Out
    if (AFTER_ATTACK(effect, 0, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, StateUtils.getOpponent(state, effect.player));
    }

    // Vortex Chop
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkStats = new CheckPokemonStatsEffect(effect.opponent.active);
      store.reduceEffect(state, checkStats);
      if (checkStats.resistance.length > 0) {
        effect.damage = 120;
      }
    }

    return state;
  }
}
