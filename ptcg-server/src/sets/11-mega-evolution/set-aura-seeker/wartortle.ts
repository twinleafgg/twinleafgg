import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Wartortle extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Squirtle';
  public hp: number = 110;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Bubble Beam',
    cost: [W, W],
    damage: 50,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Wartortle';
  public fullName: string = 'Wartortle FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bubble Beam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}
