import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Bellsprout extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Find a Friend',
    cost: [G],
    damage: 0,
    text: 'Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Bellsprout';
  public fullName: string = 'Bellsprout FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Find a Friend
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(store, state, effect.player, {}, { min: 0, max: 1, allowCancel: false });
    }

    return state;
  }
}
