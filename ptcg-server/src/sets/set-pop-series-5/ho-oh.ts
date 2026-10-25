import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../game/store/prefabs/costs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class HoOh extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    // Fire Wing
    name: 'Fire Wing',
    cost: [R, C],
    damage: 20,
    text: ''
  }, {
    // Fire Blast
    name: 'Fire Blast',
    cost: [R, R, R, C],
    damage: 60,
    text: 'Discard a Fire Energy attached to Ho-Oh.'
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Ho-Oh';
  public fullName: string = 'Ho-Oh P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fire Blast
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, R);
    }
    return state;
  }
}
