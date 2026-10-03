import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, StateUtils, PlayerType, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { BeginTurnEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_ABILITY_BLOCKED, MOVE_POKEMON_OFF_BOARD, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';

export class Wishiwashi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 180;
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Scatter',
    powerType: PowerType.ABILITY,
    text: 'At the end of your opponent\'s turn, if this Pokémon has any damage counters on it, flip a coin.If tails, shuffle this Pokémon and all cards attached to it into your deck.'
  }];

  public attacks = [{
    name: 'Hydro Splash',
    cost: [W, W, C],
    damage: 130,
    text: ''
  }];

  public set: string = 'CEC';
  public setNumber: string = '62';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wishiwashi';
  public fullName: string = 'Wishiwashi CEC';

  public readonly SCATTER_MARKER = 'SCATTER_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof BeginTurnEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      opponent.marker.addMarker(this.SCATTER_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && StateUtils.getOpponent(state, effect.player).marker.hasMarker(this.SCATTER_MARKER, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          if (cardList.damage > 0) {
            return COIN_FLIP_PROMPT(store, state, opponent, result => {
              if (result === false) {
                MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
                  pokemonDestination: opponent.deck,
                  sourceCard: this,
                });

                return store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
                  opponent.deck.applyOrder(order);
                  opponent.marker.removeMarker(this.SCATTER_MARKER, this);
                  return state;
                });
              }
              opponent.marker.removeMarker(this.SCATTER_MARKER, this);
              return state;
            });
          }
        }
      });
      opponent.marker.removeMarker(this.SCATTER_MARKER, this);
      return state;
    }
    return state;
  }
}
