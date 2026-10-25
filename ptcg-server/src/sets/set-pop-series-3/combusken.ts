import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../game/store/prefabs/costs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Combusken extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Torchic';
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Scratch
    name: 'Scratch',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Flamethrower
    name: 'Flamethrower',
    cost: [R, C, C],
    damage: 50,
    text: 'Discard a Fire Energy attached to Combusken.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Combusken';
  public fullName: string = 'Combusken P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flamethrower
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, R);
    }
    return state;
  }
}
