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
  public hp: number = 120;
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Revenge',
      cost: [R, W],
      damage: 40,
      damageCalculation: '+',
      text: "If any of your Pokémon were Knocked Out by damage from an attack from your opponent's Pokémon during their last turn, this attack does 120 more damage.",
    },
    {
      name: 'Dragon Claw',
      cost: [R, W, C],
      damage: 120,
      text: '',
    },
  ];

  public regulationMark = 'E';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '113';
  public name: string = 'Druddigon';
  public fullName: string = 'Druddigon BRS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Revenge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player, { byAttackDamage: true })) {
        effect.damage += 120;
      }
      return state;
    }

    return state;
  }
}
