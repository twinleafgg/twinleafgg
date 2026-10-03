import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SpecialCondition } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PokemonCardList } from '../../game';

import { Effect } from '../../game/store/effects/effect';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../game/store/prefabs/effect-of-attack-prefabs';

export class Pikachu extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.LIGHTNING];

  public hp: number = 60;

  public weakness = [{ type: CardType.FIGHTING, value: 10 }];

  public resistance = [{ type: CardType.METAL, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Growl',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'During your opponent\'s next turn, any damage done by attacks ' +
        'from the Defending Pokemon is reduced by 20 (before applying ' +
        'Weakness and Resistance).'
    },
    {
      name: 'Numb',
      cost: [CardType.LIGHTNING, CardType.COLORLESS, CardType.COLORLESS],
      damage: 30,
      text: 'If Pikachu evolved from Pichu during this turn, the Defending ' +
        'Pokemon is now Paralyzed.'
    }
  ];

  public set: string = 'OP9';

  public name: string = 'Pikachu';

  public fullName: string = 'Pikachu OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, 20);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList)) {
        return state;
      }
      if (cardList.pokemonPlayedTurn === state.turn && !cardList.isStage(Stage.BASIC)) {
        const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.PARALYZED]);
        store.reduceEffect(state, specialCondition);
      }
      return state;
    }

    return state;
  }

}
