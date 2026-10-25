import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Ivysaur extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Bulbasaur';
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    // Gouge
    name: 'Gouge',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 10 more damage.'
  }, {
    // Poisonpowder
    name: 'Poisonpowder',
    cost: [G, C, C],
    damage: 40,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Ivysaur';
  public fullName: string = 'Ivysaur P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gouge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }
    // Poisonpowder
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }
    return state;
  }
}
