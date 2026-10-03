import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Pidgey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Peck Off',
      cost: [C],
      damage: 10,
      text: 'Before doing damage, discard all Pokémon Tool cards attached to your opponent\'s Active Pokémon.'
    }
  ];

  public set: string = 'FLF';
  public setNumber: string = '75';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pidgey';
  public fullName: string = 'Pidgey FLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard active Pokemon's tool first
      const activePokemon = opponent.active;
      if (activePokemon.tools.length > 0) {
        // Discard all tools attached to the opponent's active Pokémon
        for (const tool of [...activePokemon.tools]) {
          MOVE_CARDS(store, state, activePokemon, opponent.discard, { cards: [tool], sourceCard: this });
        }
      }
    }
    return state;
  }
}