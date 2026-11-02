import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RemoveSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, SWITCH_IN_OPPONENT_BENCHED_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class FroslassGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Sleep Inducer',
    cost: [C],
    damage: 0,
    text: 'Switch the Defending Pokémon with 1 of your opponent\'s Benched Pokémon. The new Defending Pokémon is now Asleep.'
  }, {
    name: 'Wake-Up Slap',
    cost: [P, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is affected by any Special Conditions, this attack does 30 damage plus 20 more damage. Then, remove all Special Conditions from the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Froslass GL';
  public fullName: string = 'Froslass GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sleep Inducer
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (opponent.bench.some(b => b.cards.length > 0)) {
        return SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, effect.player, {
          sourceEffect: effect,
          onSwitched: () => {
            ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, opponent, this);
          },
        });
      }
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, opponent, this);
    }

    // Wake-Up Slap
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.specialConditions.length > 0) {
        effect.damage += 20;
        const removeSpecialCondition = new RemoveSpecialConditionsEffect(effect, undefined);
        removeSpecialCondition.target = effect.opponent.active;
        store.reduceEffect(state, removeSpecialCondition);
      }
    }

    return state;
  }
}
