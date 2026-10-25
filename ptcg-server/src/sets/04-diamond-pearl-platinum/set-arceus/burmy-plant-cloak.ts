import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class BurmyPlantCloak extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'Cloak Evolution',
    powerType: PowerType.POKEBODY,
    text: 'Burmy Plant Cloak can evolve during the turn you play it.'
  }];

  public attacks = [{
    name: 'Tackle',
    cost: [G, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Burmy Plant Cloak';
  public fullName: string = 'Burmy Plant Cloak AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cloak Evolution
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      player.canEvolve = true;
      effect.target.pokemonPlayedTurn = state.turn - 1;
    }

    return state;
  }
}
