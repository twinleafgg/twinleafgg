import {
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  CheckPokemonAttacksEffect,
  CheckPokemonPowersEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { BeginTurnEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  HAS_MARKER,
  MULTIPLE_COIN_FLIPS_PROMPT,
  REMOVE_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class DialgaLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Dialga';
  public cardType: CardType[] = [M];
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 110;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Time Skip',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: "Once during your turn (before your attack), you may have your opponent flip 2 coins. If both of them are heads, your turn ends. If both of them are tails, after your opponent draws a card at the beginning of his or her next turn, his or her turn ends. This power can't be used if Dialga is affected by a Special Condition.",
  }];

  public attacks = [{
    name: 'Metal Flash',
    cost: [M, M, C, C],
    damage: 80,
    text: "During your next turn, Dialga can't use Metal Flash.",
  }];

  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga LV.X GE';

  public readonly TIME_SKIP_EFFECT_MARKER = 'TIME_SKIP_EFFECT_MARKER';
  public readonly TIME_SKIP_USED_MARKER = 'TIME_SKIP_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.TIME_SKIP_USED_MARKER, this);

    // Time Skip
    if (
      effect instanceof BeginTurnEffect &&
      HAS_MARKER(this.TIME_SKIP_EFFECT_MARKER, effect.player, this)
    ) {
      REMOVE_MARKER(this.TIME_SKIP_EFFECT_MARKER, effect.player, this);
      const endTurnEffect = new EndTurnEffect(effect.player);
      return store.reduceEffect(state, endTurnEffect);
    }

    if (WAS_POWER_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (HAS_MARKER(this.TIME_SKIP_USED_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, opponent, 2, (results) => {
        if (results.every((result) => result === true)) {
          const endTurnEffect = new EndTurnEffect(player);
          return store.reduceEffect(state, endTurnEffect);
        }

        if (results.every((result) => result === false)) {
          ADD_MARKER(this.TIME_SKIP_EFFECT_MARKER, opponent, this);
        }
      });
      ADD_MARKER(this.TIME_SKIP_USED_MARKER, player, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, effect.attack);
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
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
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
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      // Add attacks from the previous stage to this one
      for (const evolutionCard of cardList.cards) {
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
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
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }

      // Adds the powers from the previous stage
      for (const evolutionCard of cardList.cards) {
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}
