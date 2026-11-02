import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Mudkip extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    // Super Hypno Wave
    name: 'Super Hypno Wave',
    cost: [W, C],
    damage: 20,
    text: 'The Defending Pokémon is now Asleep.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Mudkip';
  public fullName: string = 'Mudkip P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Hypno Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }
    return state;
  }
}
