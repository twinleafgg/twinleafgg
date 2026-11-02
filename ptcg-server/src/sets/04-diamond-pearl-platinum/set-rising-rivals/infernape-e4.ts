import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class InfernapeE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Split Bomb',
    cost: [R, C],
    damage: 0,
    text: 'Choose 2 of your opponent\'s Pokémon. This attack does 20 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'High Jump Kick',
    cost: [R, C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Infernape E4';
  public fullName: string = 'Infernape E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Split Bomb
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const count = Math.min(2, effect.opponent.getPokemonInPlay().length);
      if (count === 0) {
        return state;
      }
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(
        20, effect, store, state, count, count, false, [SlotType.ACTIVE, SlotType.BENCH],
      );
    }

    return state;
  }
}
