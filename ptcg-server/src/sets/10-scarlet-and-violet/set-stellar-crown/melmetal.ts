import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {MOVE_CARD_TO, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Melmetal extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Meltan';
  public cardType: CardType[] = [M];
  public hp: number = 160;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Wrack Down',
    cost: [C, C],
    damage: 50,
    text: ''
  },
  {
    name: 'Reforged Axe',
    cost: [M, C, C],
    damage: 250,
    text: 'Before doing damage, discard all Pokémon Tools from this Pokémon. If you can\'t discard any, this attack does nothing.'
  }];

  public set: string = 'SCR';
  public regulationMark: string = 'H';
  public setNumber: string = '104';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Melmetal';
  public fullName: string = 'Melmetal SCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      effect.damage = 0; // Reset damage to 0 if no tools are discarded

      // Discard active Pokemon's tool first
      const activePokemon = opponent.active;
      if (activePokemon.tools.length > 0) {
        MOVE_CARD_TO(state, activePokemon.tools[0], opponent.discard);
        if (activePokemon.tools.length > 1) {
          MOVE_CARDS(store, state, activePokemon, opponent.discard, { cards: activePokemon.tools.slice(1), sourceCard: this });
        }
        effect.damage = 250; // Set damage to 250 if a tool was discarded
      }
    }
    return state;
  }
}