import { CardType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raichu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pikachu';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Quick Attack',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 30 more damage.'
  }, {
    name: 'Gigashock',
    cost: [L, L, C],
    damage: 60,
    text: 'Does 10 damage to 2 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = 'Raichu';
  public fullName: string = 'Raichu SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }

    // Gigashock
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const benchedCount = effect.opponent.bench.filter(b => b.cards.length > 0).length;
      if (benchedCount === 0) {
        return state;
      }
      const count = Math.min(2, benchedCount);
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state, count, count, false, [SlotType.BENCH]);
    }

    return state;
  }
}
