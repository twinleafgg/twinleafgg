import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS } from '../../../game/store/prefabs/attack-effects';

export class Ursaring extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Teddiursa';
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Adrenalash',
      cost: [C, C, C],
      damage: 50,
      text: "During your next turn, each of this Pokémon's attacks does 50 more damage (before applying Weakness and Resistance).",
    },
    {
      name: 'Strength',
      cost: [C, C, C, C],
      damage: 80,
      text: '',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '76';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Ursaring';
  public fullName: string = 'Ursaring PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS(effect, {
      source: this,
      bonusDamage: 50,
      setupAttack: this.attacks[0],
    });

    return state;
  }
}
