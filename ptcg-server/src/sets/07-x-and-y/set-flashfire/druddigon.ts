import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {
  WAS_ATTACK_USED,
  WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN,
} from '../../../game/store/prefabs/prefabs';

export class Druddigon extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 110;
  public weakness = [{ type: Y }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Revenge',
      cost: [R, W],
      damage: 20,
      damageCalculation: '+',
      text: "If any of your Pokémon were Knocked Out by damage from an opponent's attack during his or her last turn, this attack does 70 more damage.",
    },
    {
      name: 'Dragon Claw',
      cost: [R, W, C, C],
      damage: 80,
      text: '',
    },
  ];

  public set: string = 'FLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Druddigon';
  public fullName: string = 'Druddigon FLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Revenge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player, { byAttackDamage: true })) {
        effect.damage += 70;
      }
      return state;
    }

    return state;
  }
}
