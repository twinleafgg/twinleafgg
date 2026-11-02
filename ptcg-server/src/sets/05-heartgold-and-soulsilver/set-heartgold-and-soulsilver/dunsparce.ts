import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, COIN_FLIP_PROMPT, MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';

export class Dunsparce extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Glare',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  },
  {
    name: 'Fade Out',
    cost: [C],
    damage: 20,
    text: 'Return Dunsparce and all cards attached to it to your hand.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Dunsparce';
  public fullName: string = 'Dunsparce HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Glare
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    // Fade Out
    if (AFTER_ATTACK(effect, 1, this)) {
      MOVE_POKEMON_OFF_BOARD(store, state, effect.player.active, {
        pokemonDestination: effect.player.hand,
        sourceCard: this,
      });
    }

    return state;
  }
}
