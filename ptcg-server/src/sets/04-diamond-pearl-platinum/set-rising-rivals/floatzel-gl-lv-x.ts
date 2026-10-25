import { Card, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, GamePhase, PlayerType, PowerType, State, StateUtils, StoreLike, pokemonHasCardTypeOptional } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class FloatzelGLLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Floatzel GL';
  public cardType: CardType[] = [W];
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 100;
  public weakness = [{ type: L, value: +30 }];
  public retreat = [];

  public powers = [{
    name: 'Water Rescue',
    powerType: PowerType.POKEBODY,
    text: 'Whenever any of your [W] Pokémon (excluding any Floatzel GL) is Knocked Out by damage from your opponent\'s attack, you may put that Pokémon and all cards that were attached to it from your discard pile into your hand.'
  }];

  public attacks = [{
    name: 'Energy Cyclone',
    cost: [W, W],
    damage: 20,
    damageCalculation: 'x',
    text: 'Choose as many Energy cards from your hand as you like and show them to your opponent. This attack does 20 damage times the number of Energy cards you chose. Put those Energy cards on top of your deck. Shuffle your deck afterward.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '104';
  public name: string = 'Floatzel GL';
  public fullName: string = 'Floatzel GL LV.X RR';

  public readonly WATER_RESCUE_MARKER = 'WATER_RESCUE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Water Rescue
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (!pokemonHasCardTypeOptional(effect.target.getPokemonCard(), CardType.WATER)) {
        return state;
      }
      if (effect.target.getPokemonCard()?.name === 'Floatzel GL') {
        return state;
      }

      let isThisInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (card) => {
        if (card.getPokemonCard() === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) {
        return state;
      }

      const target = effect.target;
      const cards = target.cards;
      cards.forEach((card) => {
        player.marker.addMarker(this.WATER_RESCUE_MARKER, card);
      });
    }

    if (effect instanceof BetweenTurnsEffect && effect.player.marker.hasMarker(this.WATER_RESCUE_MARKER)) {
      state.players.forEach((player) => {
        if (!player.marker.hasMarker(this.WATER_RESCUE_MARKER)) {
          return;
        }

        const rescued: Card[] = player.marker.markers
          .filter((m) => m.name === this.WATER_RESCUE_MARKER && m.source !== undefined)
          .map((m) => m.source!);

        MOVE_CARDS(store, state, player.discard, player.hand, { cards: rescued });
        player.marker.removeMarker(this.WATER_RESCUE_MARKER);
      });
    }

    // Energy Cyclone
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const energiesInHand = player.hand.cards.filter(
        (card) => card instanceof EnergyCard && card.superType === SuperType.ENERGY,
      );

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: energiesInHand.length },
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }

        MOVE_CARDS(store, state, player.hand, player.deck, { cards: cards });
        SHOW_CARDS_TO_PLAYER(store, state, effect.opponent, cards);
        SHUFFLE_DECK(store, state, player);
        effect.damage = cards.length * 20;
        return state;
      });
    }

    // making sure it gets put on the active pokemon
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Trying to get all of the previous stage's attacks and powers
    if (effect instanceof CheckTableStateEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
          player.showAllStageAbilities = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.attacks.push(...(evolutionCard.attacks || []));
        }
      }
    }

    if (effect instanceof CheckPokemonPowersEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner !== player) {
        return state;
      }

      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}
