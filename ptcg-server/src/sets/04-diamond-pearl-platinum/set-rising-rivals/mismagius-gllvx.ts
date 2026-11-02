import { Card, CardList, ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { CardTag, CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class MismagiusGLLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Mismagius GL';
  public cardType: CardType[] = [P];
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 100;
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Magical Return',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'As often as you like during your turn (before your attack), you may return a Pokémon Tool or Technical Machine card attached to your Pokémon to your hand. This power can\'t be used if Mismagius GL is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Darkness Magic',
    cost: [P, P, C],
    damage: 0,
    text: 'Count the number of cards in your hand. Put that many damage counters on the Defending Pokémon. You can\'t put more than 8 damage counters in this way.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = 'Mismagius GL';
  public fullName: string = 'Mismagius GL LV.X RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Magical Return
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const pool = new CardList();
      const attached: { card: Card; list: typeof player.active }[] = [];
      const isToolOrTm = (card: Card) => {
        if (!(card instanceof TrainerCard)) {
          return false;
        }
        return card.trainerType === TrainerType.TOOL
          || card.hasTag(CardTag.TECHNICAL_MACHINE)
          || card.name.includes('Technical Machine');
      };

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const candidates = [...cardList.tools, ...cardList.cards];
        for (const card of candidates) {
          if (!isToolOrTm(card) || attached.some(entry => entry.card === card)) {
            continue;
          }
          pool.cards.push(card);
          attached.push({ card, list: cardList });
        }
      });

      if (pool.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        pool,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        const match = attached.find(entry => entry.card === cards[0]);
        if (match) {
          MOVE_CARDS(store, state, match.list, player.hand, { cards: [cards[0]], sourceCard: this });
        }
      });
    }

    // Darkness Magic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const counters = Math.min(effect.player.hand.cards.length, 8);
      if (counters > 0) {
        store.reduceEffect(state, new PutCountersEffect(effect, counters * 10));
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
