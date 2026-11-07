import { CardTag, CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class MegaGolisopodex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Wimpod';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [G];
  public hp: number = 340;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [{
      name: 'Finishing Blow',
      cost: [G],
      damage: 60,
      damageCalculation: '+',
      text: "If your opponent's Active Pokémon already has any damage counters on it, this attack does 160 more damage.",
    },
    {
      name: 'Quadruple Hold',
      cost: [C, C, C],
      damage: 160,
      text: "During your opponent's next turn, the Defending Pokémon can't retreat.",
    }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '11';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Golisopod ex';
  public fullName: string = 'Mega Golisopod ex M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Finishing Blow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.active.damage > 0) {
        effect.damage += 160;
      }
    }

    // Quatro Hold
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }

    return state;
  }
}
