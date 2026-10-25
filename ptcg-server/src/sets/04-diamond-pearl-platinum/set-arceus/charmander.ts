import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Charmander extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Friends',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Fire Basic Pokémon, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Steady Firebreathing',
    cost: [R, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '59';
  public name: string = 'Charmander';
  public fullName: string = 'Charmander AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Friends
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        effect.player,
        { stage: Stage.BASIC, cardType: [R] },
        { min: 0, max: 1, allowCancel: false }
      );
    }

    return state;
  }
}
