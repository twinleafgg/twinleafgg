import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Glimmet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Poison Spray',
    cost: [D],
    damage: 10,
    text: 'Your opponent\'s Active Pokémon is now Poisoned.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Glimmet';
  public fullName: string = 'Glimmet FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Spray
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
