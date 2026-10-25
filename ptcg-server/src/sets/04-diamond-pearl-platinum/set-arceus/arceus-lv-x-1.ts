import { PokemonCard, Stage, CardType, CardTag, PowerType, StoreLike, State, StateUtils, ChooseEnergyPrompt, GameMessage, Card, GameError, PlayerType, SuperType } from "../../../game";
import { DiscardCardsEffect } from "../../../game/store/effects/attack-effects";
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect, CheckTableStateEffect, CheckPokemonAttacksEffect, CheckPokemonPowersEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { PlayPokemonEffect } from "../../../game/store/effects/play-card-effects";
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class ArceusLvX1 extends PokemonCard {
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
    name: 'Psychic Bolt',
    cost: [L, P, C],
    damage: 100,
    text: 'Discard a [L] Energy and a [P] Energy attached to Arceus.',
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus LV.X 1 AR';

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
        }
      });
    }

    // Psychic Bolt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.PSYCHIC, CardType.LIGHTNING],
          { allowCancel: false },
        ),
        (energy) => {
          const cards: Card[] = (energy || []).map((e) => e.card);
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
        },
      );
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
