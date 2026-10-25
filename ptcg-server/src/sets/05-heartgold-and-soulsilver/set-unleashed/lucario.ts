import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ARM_OUTGOING_ATTACK_DAMAGE_BONUS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lucario extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Riolu';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Bulk Up',
    cost: [C],
    damage: 30,
    text: 'During your next turn, each of Lucario\'s attacks does 30 more damage to the Defending Pokémon (before applying Weakness and Resistance).'
  },
  {
    name: 'Magnum Punch',
    cost: [F, F],
    damage: 50,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Lucario';
  public fullName: string = 'Lucario UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bulk Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ARM_OUTGOING_ATTACK_DAMAGE_BONUS_NEXT_TURN(effect.player.active, 30);
    }

    return state;
  }
}
