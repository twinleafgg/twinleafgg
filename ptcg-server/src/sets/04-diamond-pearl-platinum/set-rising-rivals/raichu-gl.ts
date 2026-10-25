import { CardTag, CardType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RaichuGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Thunder Throw',
    cost: [C],
    damage: 0,
    text: 'Choose 2 of your opponent\'s Benched Pokémon. This attack does 10 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Repeat Lightning',
    cost: [L, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each of your opponent\'s Benched Pokémon that has any damage counters on it.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Raichu GL';
  public fullName: string = 'Raichu GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunder Throw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const benchCount = effect.opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchCount === 0) {
        return state;
      }
      const count = Math.min(2, benchCount);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count, false, [SlotType.BENCH]);
    }

    // Repeat Lightning
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const damagedBench = effect.opponent.bench.filter(b => b.cards.length > 0 && b.damage > 0).length;
      effect.damage += 10 * damagedBench;
    }

    return state;
  }
}
