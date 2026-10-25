import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Pidgey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    // Quick Attack
    name: 'Quick Attack',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 10 more damage.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Pidgey';
  public fullName: string = 'Pidgey P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quick Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }
    return state;
  }
}
