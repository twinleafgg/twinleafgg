import { PokemonCard } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HoOh extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Combustion',
    cost: [R],
    damage: 20,
    text: ''
  }, {
    name: 'Sacred Fire',
    cost: [R, R, C, C],
    damage: 0,
    text: 'Flip a coin. If heads, choose 1 of your opponent\'s Pokémon. This attack does 80 damage to that Pokémon. This attack\'s damage isn\'t affected by Weakness or Resistance.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Ho-Oh';
  public fullName: string = 'Ho-Oh HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sacred Fire
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreWeakness = true;
      effect.ignoreResistance = true;
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(80, effect, store, state);
        }
      });
    }

    return state;
  }
}
