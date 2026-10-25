import { Card, ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class AbsolGLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Absol G';
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 100;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Darkness Send',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), when you put Absol G LV.X from your hand onto your Active Absol G, you may flip 3 coins. For each heads, put the top card from your opponent\'s deck in the Lost Zone.'
  }];

  public attacks = [{
    name: 'Darkness Slugger',
    cost: [D, C],
    damage: 30,
    damageCalculation: '+',
    text: 'You may discard a card from your hand. If you do, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '141';
  public name: string = 'Absol G';
  public fullName: string = 'Absol G LV.X SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
          const heads = results.filter(r => r).length;
          for (let i = 0; i < heads; i++) {
            if (opponent.deck.cards.length > 0) {
              MOVE_CARDS(store, state, opponent.deck, opponent.lostzone, { count: 1, sourceCard: this });
            }
          }
        });
      });
    }

    // Darkness Slugger
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
          effect.damage += 30;
        }
      });
    }

    if (effect instanceof CheckTableStateEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          player.showAllStageAbilities = true;
        }
      });
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
          effect.attacks.push(...((evolutionCard as PokemonCard).attacks || []));
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
          effect.powers.push(...((evolutionCard as PokemonCard).powers || []));
        }
      }
    }

    return state;
  }
}
