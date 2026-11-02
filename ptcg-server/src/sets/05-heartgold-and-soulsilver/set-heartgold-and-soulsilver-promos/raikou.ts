import { PokemonCard } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raikou extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Zap Cannon',
    cost: [L, L, C],
    damage: 70,
    text: 'During your next turn, Raikou can\'t use Zap Cannon.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Raikou';
  public fullName: string = 'Raikou HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Zap Cannon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[0]);
    }

    return state;
  }
}
