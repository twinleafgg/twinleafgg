import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lurantisex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Fomantis';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [G];
  public hp: number = 260;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Lively Cutter',
      cost: [G],
      damage: 60,
      damageCalculation: '+',
      text: 'If this Pokémon was healed during this turn, this attack does 200 more damage.',
    },
    {
      name: 'Leaf Guard',
      cost: [G, C],
      damage: 140,
      text: "During your opponent's next turn, this Pokémon takes 50 less damage from attacks (after applying Weakness and Resistance).",
    },
  ];

  public set: string = 'PBL';
  public setNumber: string = '4';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Lurantis ex';
  public fullName: string = 'Lurantis ex M5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lively Cutter
    // Ref: set-fates-collide/altaria-ex.ts (Powerful Gain — healedThisTurn)
    if (WAS_ATTACK_USED(effect, 0, this) && effect.player.active.healedThisTurn) {
      effect.damage += 200;
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.player.active.damageReductionNextTurn = 50;
    }
    return state;
  }
}
