import { PokemonCard, Stage, CardType, SpecialCondition, PowerType, State, StoreLike } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Riolu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public powers = [{
    // Inner Focus
    name: 'Inner Focus',
    powerType: PowerType.POKEBODY,
    text: 'Riolu can\'t be Paralyzed.'
  }];

  public attacks = [{
    // Quick Attack
    name: 'Quick Attack',
    cost: [F],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 10 more damage.'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Riolu';
  public fullName: string = 'Riolu P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.specialConditions = effect.specialConditions.filter(c => c !== SpecialCondition.PARALYZED);
    }
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }
    return state;
  }
}
