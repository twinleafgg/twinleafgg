import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ADD_POISON_TO_PLAYER_ACTIVE, AFTER_ATTACK, IS_ABILITY_BLOCKED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { Card, PowerType, ShowCardsPrompt, State, StoreLike } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
export class Venusaur extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Ivysaur';

  public cardType: CardType[] = [G];

  public hp: number = 140;

  public weakness = [{ type: R }];

  public resistance = [{ type: W, value: -20 }];

  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Floral Fragrance',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may search your deck for a Pokémon, reveal it, and put it into your hand. Shuffle your deck afterward.'
  }];

  public attacks = [
    {
      name: 'Poison Powder',
      cost: [G, G, C, C],
      damage: 70,
      text: 'The Defending Pokémon is now Poisoned.'
    }
  ];

  public set: string = 'DEX';

  public setNumber: string = '3';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Venusaur';

  public fullName: string = 'Venusaur DEX';

  public readonly FLORAL_FRAGRANCE_MARKER = 'FLORAL_FRAGRANCE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reset marker when Pokémon is played
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.FLORAL_FRAGRANCE_MARKER, this);
    }

    // Floral Fragrance ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.FLORAL_FRAGRANCE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      player.marker.addMarker(this.FLORAL_FRAGRANCE_MARKER, this);

      let chosen: Card[] = [];

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        chosen = selected || [];

        if (chosen.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: chosen, sourceCard: this });
          store.prompt(state, new ShowCardsPrompt(
            StateUtils.getOpponent(state, player).id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            chosen
          ), () => { });
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    // Poison Powder attack
    if (AFTER_ATTACK(effect, 0, this)) {
      ADD_POISON_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    // Clean up marker at end of turn
    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.FLORAL_FRAGRANCE_MARKER, this)) {
      effect.player.marker.removeMarker(this.FLORAL_FRAGRANCE_MARKER, this);
    }

    return state;
  }
}
