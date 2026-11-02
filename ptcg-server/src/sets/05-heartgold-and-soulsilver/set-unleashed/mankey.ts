import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mankey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Punch',
    cost: [C],
    damage: 10,
    text: ''
  },
  {
    name: 'Karate Chop',
    cost: [F, C],
    damage: 40,
    damageCalculation: '-',
    text: 'Does 40 damage minus 10 damage for each damage counter on Mankey.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Mankey';
  public fullName: string = 'Mankey UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Karate Chop
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = Math.max(40 - effect.player.active.damage, 0);
    }

    return state;
  }
}
