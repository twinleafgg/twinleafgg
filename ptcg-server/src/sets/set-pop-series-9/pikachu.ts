import { PokemonCard, Stage, CardType, SpecialCondition, StoreLike, State, StateUtils, PokemonCardList } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      // Growl
      name: 'Growl',
      cost: [C],
      damage: 0,
      text: 'During your opponent\'s next turn, any damage done by attacks from the Defending Pokemon is reduced by 20 (before applying Weakness and Resistance).'
    },
    {
      // Numb
      name: 'Numb',
      cost: [L, C, C],
      damage: 30,
      text: 'If Pikachu evolved from Pichu during this turn, the Defending Pokemon is now Paralyzed.'
    }
  ];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
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
