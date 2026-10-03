/* eslint-disable indent */
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';

import { GameError, PowerType } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';

import { CardTag } from '../../../game/store/card/card-types';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class KricketuneV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];
  public regulationMark = 'E';
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 180;
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [{
    name: 'Exciting Stage',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may draw cards until you have ' +
    '3 cards in your hand. If this Pokémon is in the Active Spot, ' +
    'you may draw cards until you have 4 cards in your hand ' +
    'instead. You can\'t use more than 1 Exciting Stage Ability ' +
    'each turn.'
  }];

  public attacks = [{
    name: 'X-Scissor',
    cost: [G, C, C],
    damage: 80,
    text: 'Flip a coin. If heads, this attack does 80 more damage.'
  }];

  public set: string = 'BST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Kricketune V';
  public fullName: string = 'Kricketune V BST';

  public readonly EXCITING_STAGE_MARKER = 'EXCITING_STAGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.EXCITING_STAGE_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.EXCITING_STAGE_MARKER, this)
    ) {
      const player = effect.player;
      player.marker.removeMarker(this.EXCITING_STAGE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.marker.hasMarker(this.EXCITING_STAGE_MARKER)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      player.marker.addMarker(this.EXCITING_STAGE_MARKER, this);
      if (player.active.getPokemonCard() === this) {
        while (player.hand.cards.length < 4) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      } else {
        while (player.hand.cards.length < 3) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      }

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          effect.damage += 80;
        }
      });
    }

    return state;
  }
}
