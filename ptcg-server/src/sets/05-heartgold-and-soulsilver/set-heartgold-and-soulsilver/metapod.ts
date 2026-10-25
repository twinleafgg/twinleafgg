import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonStatsEffect, CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Metapod extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Caterpie';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public powers = [{
    name: 'Green Shield',
    powerType: PowerType.POKEBODY,
    text: 'Each of your Grass Pokémon has no Weakness.'
  }];

  public attacks = [{
    name: 'Sharpen',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Metapod';
  public fullName: string = 'Metapod HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Shield
    if (effect instanceof CheckPokemonStatsEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!StateUtils.isPokemonInPlay(owner, this)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      const checkType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.GRASS)) {
        effect.weakness = [];
      }
    }

    return state;
  }
}
