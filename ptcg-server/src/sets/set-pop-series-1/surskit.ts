import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Surskit extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    // Bubble
    name: 'Bubble',
    cost: [W],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Surskit';
  public fullName: string = 'Surskit P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bubble
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
