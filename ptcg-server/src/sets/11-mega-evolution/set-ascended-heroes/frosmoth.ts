import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameError, GameMessage, PlayerType, AttachEnergyPrompt, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PowerType } from '../../../game/store/card/pokemon-types';
import { EndTurnEffect, AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {DRAW_CARDS, ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Frosmoth extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Snom';
  public cardType: CardType[] = [W];
  public hp: number = 110;
  public weakness = [{ type: M }];
  public resistance = [];
  public retreat = [C, C];

  public powers = [{
    name: 'Alluring Wings',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if this Pokémon is in your Active Spot, you may use this Ability. Each player draws a card.'
  }];

  public attacks = [{
    name: 'Cold Cyclone',
    cost: [W, W],
    damage: 90,
    text: 'Move a [W] Energy from this Pokémon to 1 of your Benched Pokémon.'
  }];

  public regulationMark: string = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Frosmoth';
  public fullName: string = 'Frosmoth M2a';

  public readonly INVITING_WINGS_MARKER = 'INVITING_WINGS_MARKER';
  private readonly COLD_CYCLONE_MARKER = 'COLD_CYCLONE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reset marker when Pokemon is played
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.INVITING_WINGS_MARKER, this);
    }

    // Reset marker at end of turn
    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.INVITING_WINGS_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.INVITING_WINGS_MARKER, this);
    }

    // Inviting Wings ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const pokemonCard = player.active.getPokemonCard();

      // Check if Pokemon is in active spot
      if (pokemonCard !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Check if ability was already used this turn
      if (player.marker.hasMarker(this.INVITING_WINGS_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // Check if decks have cards to draw
      const opponent = StateUtils.getOpponent(state, player);
      if (player.deck.cards.length === 0 && opponent.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Draw cards for both players
      if (player.deck.cards.length > 0) {
        DRAW_CARDS(store, state, player, 1);
      }
      if (opponent.deck.cards.length > 0) {
        DRAW_CARDS(store, state, opponent, 1);
      }

      // Mark ability as used
      player.marker.addMarker(this.INVITING_WINGS_MARKER, this);

      // Add visual effect
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.COLD_CYCLONE_MARKER, effect.player, this);
      return state;
    }

    if (effect instanceof AfterAttackEffect && HAS_MARKER(this.COLD_CYCLONE_MARKER, effect.player, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      // Valid Water energy types
      const validTypes = [CardType.WATER, CardType.ANY];

      // Then prompt for energy movement
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.active,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1, validCardTypes: validTypes }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.COLD_CYCLONE_MARKER, this);

    return state;
  }
}

