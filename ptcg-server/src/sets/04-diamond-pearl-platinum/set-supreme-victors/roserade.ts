import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Roserade extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Roselia';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Cut',
    cost: [G],
    damage: 20,
    text: ''
  }, {
    name: 'Poison Seed',
    cost: [G, C, C],
    damage: 30,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Roserade';
  public fullName: string = 'Roserade SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Seed
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
