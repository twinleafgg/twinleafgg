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
  CheckPokemonStatsEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';

export class ArceusLvX3 extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Arceus';
  public cardType: CardType[] = [C];
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.ARCEUS];
  public hp: number = 120;
  public retreat = [C];

  public powers = [
    {
      name: 'Multitype',
      powerType: PowerType.POKEBODY,
      text: "Arceus LV.X's type is the same type as its previous Level.",
    },
    {
      name: 'Omniscient',
      powerType: PowerType.POKEBODY,
      text: 'Arceus can use the attacks of all Arceus you have in play as its own. (You still need the necessary Energy to use each attack.)',
    },
  ];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Arceus';
  public fullName: string = 'Arceus LV.X 3 AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
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

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

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

      for (const evolutionCard of cardList.cards) {
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.attacks.push(...((evolutionCard as PokemonCard).attacks || []));
        }
      }

      if (owner.active.getPokemonCard() === this && !IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
          if (card.name === 'Arceus' && card !== this) {
            effect.attacks.push(...(card.attacks || []));
          }
        });
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
