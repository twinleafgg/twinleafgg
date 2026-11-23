import { CardType, PlayerType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Accelgor extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Shelmet';
  public hp: number = 100;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Stealth Slash',
    cost: [C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'This attack does 50 damage for each Evolution Pokémon your opponent has in play.'
  },
  {
    name: 'Charge In',
    cost: [G, G],
    damage: 70,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Accelgor';
  public fullName: string = 'Accelgor FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stealth Slash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      let evolutionCount = 0;

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, pokemon) => {
        if (pokemon.stage !== Stage.BASIC) {
          evolutionCount++;
        }
      });

      effect.damage = 50 * evolutionCount;
    }

    return state;
  }
}
