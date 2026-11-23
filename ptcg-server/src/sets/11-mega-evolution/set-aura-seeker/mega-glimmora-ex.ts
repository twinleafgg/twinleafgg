import { CardTag, CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PUT_DAMAGE_COUNTERS_ON_X_OF_YOUR_OPPONENTS_POKEMON_UNTIL_REMAINING_HP_IS } from '../../../game/store/prefabs/attack-effects';
import { THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MegaGlimmoraex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Glimmet';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public hp: number = 320;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Toxic Gem',
    cost: [D, D],
    damage: 0,
    text: 'Place damage counters on 2 of your opponent\'s Pokémon until their remaining HP is 60 each.'
  },
  {
    name: 'Great Spin',
    cost: [D, D, C],
    damage: 250,
    text: 'During your next turn, this Pokémon can\'t attack.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '54';
  public name: string = 'Mega Glimmora ex';
  public fullName: string = 'Mega Glimmora ex FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Toxic Gem
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return PUT_DAMAGE_COUNTERS_ON_X_OF_YOUR_OPPONENTS_POKEMON_UNTIL_REMAINING_HP_IS(
        2,
        60,
        store,
        state,
        effect,
      );
    }

    // Great Spin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}
