import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Miraidon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 120;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Claw Slash',
    cost: [L, C],
    damage: 50,
    text: ''
  },
  {
    name: 'Flashing Bolt',
    cost: [L, L, C],
    damage: 120,
    text: 'During your next turn, this Pokémon can\'t use Flashing Bolt.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '42';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Miraidon';
  public fullName: string = 'Miraidon MEE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flash Bolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.cannotUseAttacksNextTurnPending.push('Flashing Bolt');
    }

    return state;
  }
}
