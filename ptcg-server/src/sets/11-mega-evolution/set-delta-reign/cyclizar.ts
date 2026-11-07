import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cyclizar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 120;
  public weakness = [];
  public retreat = [C];

  public attacks = [{
    name: 'Bite',
    cost: [C, C],
    damage: 30,
    text: ''
  },
  {
    name: 'Break Through',
    cost: [G, D, C],
    damage: 110,
    text: 'This attack also does 30 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Cyclizar';
  public fullName: string = 'Cyclizar M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Breakthrough
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    return state;
  }
}