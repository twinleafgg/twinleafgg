import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, EnergyCard, GameError, GameMessage, PlayerType, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

import {WAS_ATTACK_USED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Revavroom extends PokemonCard {
  public regulationMark = 'G';
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [M];
  public hp: number = 140;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];
  public evolvesFrom: string = 'Varoom';

  public powers = [{
    name: 'Rumbling Engine',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'You must discard an Energy card from your hand in order to use this Ability. Once during your turn, you may draw cards until you have 6 cards in your hand.'
  }];

  public attacks = [{
    name: 'Knock Away',
    cost: [M, C, C, C],
    damage: 90,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 90 more damage.'
  }];

  public set: string = 'SVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '142';
  public name: string = 'Revavroom';
  public fullName: string = 'Revavroom SVI';

  public readonly RUMBLING_ENGINE_MARKER = 'RUMBLING_ENGINE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.RUMBLING_ENGINE_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.RUMBLING_ENGINE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length >= 7) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInHand = player.hand.cards.some(c => {
        return c instanceof EnergyCard;
      });

      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.RUMBLING_ENGINE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        while (player.hand.cards.length < 6) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }

        player.marker.addMarker(this.RUMBLING_ENGINE_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result === true) {
          effect.damage += 90;
        }
      });
    }

    return state;
  }
}