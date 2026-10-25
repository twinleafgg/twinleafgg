import { PowerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { COIN_FLIP_PROMPT, HEAL_X_DAMAGE_FROM_THIS_POKEMON, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RoseradeC extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Natural Cure',
    powerType: PowerType.POKEBODY,
    text: 'When you attach an Energy card from your hand to Roserade C, remove all Special Conditions from Roserade C.'
  }];

  public attacks = [{
    name: 'Magical Leaf',
    cost: [P, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 40 damage plus 20 more damage and remove 2 damage counters from Roserade C.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';
  public name: string = 'Roserade C';
  public fullName: string = 'Roserade C SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Natural Cure
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        effect.target.clearAllSpecialConditions();
      }
    }

    // Magical Leaf
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 20;
          HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
        }
      });
    }

    return state;
  }
}
