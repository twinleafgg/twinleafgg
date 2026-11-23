import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cryogonal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public retreat = [C];

  public attacks = [{
    name: 'Hail',
    cost: [W, W],
    damage: 0,
    text: 'This attack does 20 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Cryogonal';
  public fullName: string = 'Cryogonal FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(20, effect, store, state);
    }

    return state;
  }
}
