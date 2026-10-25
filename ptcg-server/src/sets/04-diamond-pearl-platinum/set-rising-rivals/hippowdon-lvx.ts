import { Card, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { CardTag, CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ADD_MARKER, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, SHUFFLE_DECK, THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class HippowdonLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Hippowdon';
  public cardType: CardType[] = [F];
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 130;
  public weakness = [{ type: W, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Sand Reset',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during a game on your turn (before your attack), each player shuffles all cards in play (excluding Pokémon and Supporter cards) into his or her deck. You can\'t use more than 1 Sand Reset Poké-Power each game.'
  }];

  public attacks = [{
    name: 'Double Shoot',
    cost: [F, F, C, C],
    damage: 0,
    text: 'Discard 2 Fighting Energy attached to Hippowdon and choose 2 of your opponent\'s Benched Pokémon. This attack does 40 damage to each of them. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '107';
  public name: string = 'Hippowdon';
  public fullName: string = 'Hippowdon LV.X RR';

  public readonly SAND_RESET_MARKER = 'SAND_RESET_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sand Reset
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.SAND_RESET_MARKER, player) || HAS_MARKER(this.SAND_RESET_MARKER, opponent)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ADD_MARKER(this.SAND_RESET_MARKER, player, this);
      ADD_MARKER(this.SAND_RESET_MARKER, opponent, this);

      const shuffleInPlay = (owner: typeof player) => {
        const moves: { from: typeof owner.active; cards: Card[] }[] = [];
        owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          const cards = cardList.cards.filter(c =>
            !(c instanceof PokemonCard) &&
            !(c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER)
          );
          if (cards.length > 0) {
            moves.push({ from: cardList, cards });
          }
        });
        if (owner.stadium.cards.length > 0) {
          const stadiumCards = owner.stadium.cards.filter(c =>
            !(c instanceof PokemonCard) &&
            !(c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER)
          );
          if (stadiumCards.length > 0) {
            MOVE_CARDS(store, state, owner.stadium, owner.deck, { cards: stadiumCards, sourceCard: this });
          }
        }
        for (const move of moves) {
          MOVE_CARDS(store, state, move.from, owner.deck, { cards: move.cards, sourceCard: this });
        }
        SHUFFLE_DECK(store, state, owner);
      };

      shuffleInPlay(player);
      shuffleInPlay(opponent);
    }

    // Double Shoot
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2, CardType.FIGHTING);
      const benched = effect.opponent.bench.filter(b => b.cards.length > 0).length;
      const count = Math.min(2, benched);
      if (count > 0) {
        THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(40, effect, store, state, count, count);
      }
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
