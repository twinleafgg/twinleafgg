import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Meditite extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Psyshot',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    name: 'Karate Chop',
    cost: [P, C],
    damage: 30,
    damageCalculation: '-',
    text: 'Does 30 damage minus 10 damage for each damage counter on Meditite.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '113';
  public name: string = 'Meditite';
  public fullName: string = 'Meditite SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Karate Chop
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = Math.max(30 - effect.player.active.damage, 0);
    }

    return state;
  }
}
