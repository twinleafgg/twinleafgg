import { PokemonCard, Stage, CardType, CardTag, PowerType, StoreLike, State, StateUtils, GameError, GameMessage, PlayerType, SuperType } from "../../../game";
import { CheckPokemonStatsEffect, CheckTableStateEffect, CheckPokemonAttacksEffect, CheckPokemonPowersEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { PlayPokemonEffect } from "../../../game/store/effects/play-card-effects";
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED, COIN_FLIP_PROMPT } from "../../../game/store/prefabs/prefabs";

export class ArceusLvX2 extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Arceus';
  public cardType: CardType[] = [C];
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.ARCEUS];
  public hp: number = 120;
  public retreat = [C];

  public powers = [{
    name: 'Multitype',
    powerType: PowerType.POKEBODY,
    text: "Arceus LV.X's type is the same type as its previous Level.",
  }];

  public attacks = [{
    name: 'Meteor Blast',
    cost: [G, R, C],
    damage: 100,
    text: "Flip a coin. If tails, this attack's base damage is 50 instead of 100.",
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus LV.X 2 AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Multitype
    if (effect instanceof CheckPokemonStatsEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);

      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      effect.target.cards.forEach((card) => {
        if (card instanceof PokemonCard && card.name === 'Arceus' && card !== this) {
          const pokemon = effect.target.getPokemonCard();
          if (pokemon) {
            pokemon.cardType = [...card.cardType];
          }
          return state;
        }
      });
    }

    // Psychic Bolt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, (result) => {
        if (!result) {
          effect.damage = 50;
        }
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
