import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Vulpix extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Continuous Steps',
    cost: [R],
    damage: 20,
    damageCalculation: 'x',
    text: 'Flip a coin until you get tails. This attack does 20 damage for each heads.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Vulpix';
  public fullName: string = 'Vulpix FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Continuous Steps
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS(store, state, effect, 20);
    }

    return state;
  }
}
