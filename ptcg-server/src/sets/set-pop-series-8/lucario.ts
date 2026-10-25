import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../game/store/prefabs/attack-effects';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Lucario extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Riolu';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: 20 }];
  public retreat = [C];

  public attacks = [{
    // Blocking Punch
    name: 'Blocking Punch',
    cost: [M, C],
    damage: 40,
    text: 'During your opponent\'s next turn, any damage done to Lucario by attacks is reduced by 20 (after applying Weakness and Resistance).'
  }, {
    // Striking Kick
    name: 'Striking Kick',
    cost: [F, C, C],
    damage: 60,
    text: 'This attack\'s damage isn\'t affected by Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Lucario';
  public fullName: string = 'Lucario P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Blocking Punch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 20);
    }
    // Striking Kick
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 60);
    }
    return state;
  }
}
