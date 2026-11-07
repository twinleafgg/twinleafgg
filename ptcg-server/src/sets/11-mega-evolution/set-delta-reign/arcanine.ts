import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GET_PLAYER_PRIZES, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Arcanine extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Growlithe';
  public cardType: CardType[] = [R];
  public hp: number = 150;
  public weakness = [{ type: W }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Fervent Fang',
    cost: [R, C, C],
    damage: 90,
    damageCalculation: '+',
    text: 'If your opponent has 4 or fewer Prize cards remaining, this attack does 90 more damage.'
  },
  {
    name: 'Heat Tackle',
    cost: [R, R, C, C],
    damage: 200,
    text: 'This Pokémon also does 50 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Arcanine';
  public fullName: string = 'Arcanine M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energetic Fang
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (GET_PLAYER_PRIZES(opponent).length <= 4) {
        effect.damage += 90;
      }
    }

    // Heat Tackle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 50);
    }

    return state;
  }
}