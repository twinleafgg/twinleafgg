import { CardType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_A_STADIUM_CARD_IN_PLAY, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { reduceIncarnateUnionEffect } from './incarnate-union';

export class Landorus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 130;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public powers = [{
    name: 'Incarnate Solidarity',
    powerType: PowerType.ABILITY,
    text: 'If you have Tornadus, Thundurus, Landorus, and Enamorus in play, ignore all [C] Energy in the costs of attacks used by this Pokémon.',
  }];

  public attacks = [{
    name: 'Gaia Crush',
    cost: [F, C, C],
    damage: 110,
    text: 'Discard a Stadium in play.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '54';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Landorus';
  public fullName: string = 'Landorus M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Incarnate Union
    if (effect instanceof CheckAttackCostEffect) {
      return reduceIncarnateUnionEffect(store, state, effect, this);
    }

    // Gaia Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_A_STADIUM_CARD_IN_PLAY(state);
    }

    return state;
  }
}
