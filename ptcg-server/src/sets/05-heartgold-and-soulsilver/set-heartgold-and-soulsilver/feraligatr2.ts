import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DAMAGE_OPPONENT_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Feraligatr2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Croconaw';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Spinning Tail',
    cost: [W, C, C],
    damage: 0,
    text: 'This attack does 20 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Surf',
    cost: [W, W, C, C],
    damage: 80,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Feraligatr';
  public fullName: string = 'Feraligatr HS2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spinning Tail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const targets = [opponent.active, ...opponent.bench.filter(b => b.cards.length > 0)];
      DAMAGE_OPPONENT_POKEMON(store, state, effect, 20, targets);
    }

    return state;
  }
}
