import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class NidoranFemale extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Find a Friend',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.'
  },
  {
    name: 'Gnaw',
    cost: [D],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Nidoran ♀';
  public fullName: string = 'Nidoran ♀ M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Find a Friend
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(store, state, effect.player, {}, { min: 0, max: 1, allowCancel: false });
    }

    return state;
  }
}
