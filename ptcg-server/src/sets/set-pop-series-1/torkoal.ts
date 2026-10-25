import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Torkoal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    // Amnesia
    name: 'Amnesia',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of the Defending Pokémon\'s attacks. That Pokémon can\'t use that attack during your opponent\'s next turn.'
  }, {
    // Body Slam
    name: 'Body Slam',
    cost: [R, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Torkoal';
  public fullName: string = 'Torkoal P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Amnesia
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENTS_POKEMON_CANNOT_USE_THAT_ATTACK(store, state, effect, this);
    }

    // Body Slam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}
