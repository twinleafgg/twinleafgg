import { PokemonCard, CardTag, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Charmeleon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Charmander';
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    // Slash
    name: 'Slash',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    // Thunder Jolt
    name: 'Thunder Jolt',
    cost: [L, C, C],
    damage: 50,
    text: 'Flip a coin. If tails, Charmeleon does 10 damage to itself.'
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Charmeleon δ';
  public fullName: string = 'Charmeleon δ P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunder Jolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
        }
      });
    }
    return state;
  }
}
