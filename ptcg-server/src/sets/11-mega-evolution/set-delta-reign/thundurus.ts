import { CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { reduceIncarnateUnionEffect } from './incarnate-union';

export class Thundurus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 120;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Incarnate Solidarity',
    powerType: PowerType.ABILITY,
    text: 'If you have Tornadus, Thundurus, Landorus, and Enamorus in play, ignore all [C] Energy in the costs of attacks used by this Pokémon.',
  }];

  public attacks = [{
    name: 'Thunderous Edge',
    cost: [L, C, C],
    damage: 90,
    text: 'This attack\'s damage isn\'t affected by any effects on your opponent\'s Active Pokémon.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '35';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Thundurus';
  public fullName: string = 'Thundurus M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Incarnate Union
    if (effect instanceof CheckAttackCostEffect) {
      return reduceIncarnateUnionEffect(store, state, effect, this);
    }

    // Thunder Edge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 90);
    }

    return state;
  }
}
