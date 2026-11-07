import { CardTag, CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { reduceIncarnateUnionEffect } from './incarnate-union';

export class Enamorus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 120;
  public weakness = [{ type: M }];
  public retreat = [C];

  public powers = [{
    name: 'Incarnate Solidarity',
    powerType: PowerType.ABILITY,
    text: 'If you have Tornadus, Thundurus, Landorus, and Enamorus in play, ignore all [C] Energy in the costs of attacks used by this Pokémon.',
  }];

  public attacks = [{
    name: 'Rising Heart',
    cost: [P, P, C, C],
    damage: 100,
    damageCalculation: '+',
    text: "If your opponent's Active Pokémon is a Pokémon ex, this attack does 100 more damage.",
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '48';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Enamorus';
  public fullName: string = 'Enamorus M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Incarnate Union
    if (effect instanceof CheckAttackCostEffect) {
      return reduceIncarnateUnionEffect(store, state, effect, this);
    }

    // Rising Heart
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponentActive = effect.opponent.active.getPokemonCard();
      if (opponentActive?.hasTag(CardTag.POKEMON_ex)) {
        effect.damage += 100;
      }
    }

    return state;
  }
}
