import { CardType, PlayerType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Escavalier extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Karrablast';
  public hp: number = 120;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Cavalry Thrust',
    cost: [C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'This attack does 50 damage for each of your opponent\'s Basic Pokémon in play.'
  },
  {
    name: 'Iron Lance',
    cost: [M, M, C],
    damage: 120,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '58';
  public name: string = 'Escavalier';
  public fullName: string = 'Escavalier FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cavalry Thrust
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      let basicCount = 0;

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, pokemon) => {
        if (pokemon.stage === Stage.BASIC) {
          basicCount++;
        }
      });

      effect.damage = 50 * basicCount;
    }

    return state;
  }
}
