import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Poliwag extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Family',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Basic Pokémon and put it onto your Bench. Shuffle your deck afterward.'
  },
  {
    name: 'Razor Fin',
    cost: [W, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '58';
  public name: string = 'Poliwag';
  public fullName: string = 'Poliwag UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Family
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
        store,
        state,
        effect.player,
        { stage: Stage.BASIC },
        { min: 0, max: 1, allowCancel: true }
      );
    }

    return state;
  }
}
