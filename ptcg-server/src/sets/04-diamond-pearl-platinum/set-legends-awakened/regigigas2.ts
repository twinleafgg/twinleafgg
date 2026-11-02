import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Regigigas2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public powers = [{
    // Recover Mechanism
    name: 'Recover Mechanism',
    powerType: PowerType.POKEBODY,
    text: 'When you attach an Energy card from your hand to Regigigas, remove all Special Conditions from Regigigas.'
  }];

  public attacks = [{
    // Gigaton Punch
    name: 'Gigaton Punch',
    cost: [C, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 60 damage plus 20 more damage and does 20 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Regigigas';
  public fullName: string = 'Regigigas LA2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Recover Mechanism
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        const conditions = effect.target.specialConditions.slice();
        conditions.forEach(condition => effect.target.removeSpecialCondition(condition));
      }
    }

    // Gigaton Punch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 20;
          THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
        }
      });
    }

    return state;
  }
}
