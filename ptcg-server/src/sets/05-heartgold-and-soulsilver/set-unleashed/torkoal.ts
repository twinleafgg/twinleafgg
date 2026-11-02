import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ADD_BURN_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Torkoal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    name: 'Hot Snort',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Torkoal from your hand onto your Bench, you may flip a coin. If heads, the Defending Pokémon is now Burned.'
  }];

  public attacks = [{
    name: 'Flare',
    cost: [R, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Torkoal';
  public fullName: string = 'Torkoal UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hot Snort
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (effect.target === player.active) {
        return state;
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }
        COIN_FLIP_PROMPT(store, state, player, result => {
          if (result) {
            ADD_BURN_TO_PLAYER_ACTIVE(store, state, StateUtils.getOpponent(state, player), this);
          }
        });
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    return state;
  }
}
