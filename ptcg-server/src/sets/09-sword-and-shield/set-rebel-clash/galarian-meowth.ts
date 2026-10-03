import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, StateUtils, Card, GameError, GameMessage, ChooseCardsPrompt, ShuffleDeckPrompt, ShowCardsPrompt, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GalarianMeowth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.METAL];
  public hp: number = 60;
  public weakness = [{ type: CardType.FIRE }];
  public resistance = [{ type: CardType.GRASS, value: -30 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Evolution Roar',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: ' You must discard 2 cards from your hand in order to use this Ability.'
      + 'Once during your turn, you may search your deck for a Galarian Perrserker, reveal it, and put it into your hand.'
      + 'Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Scratch',
    cost: [CardType.METAL, CardType.COLORLESS],
    damage: 20,
    text: ''
  }];

  public set = 'RCL';
  public regulationMark = 'D';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '126';
  public name = 'Galarian Meowth';
  public fullName = 'Galarian Meowth RCL';

  public readonly EVOLUTION_ROAR_MARKER = 'EVOLUTION_ROAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.EVOLUTION_ROAR_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.EVOLUTION_ROAR_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.marker.hasMarker(this.EVOLUTION_ROAR_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let cards: Card[] = [];

      if (player.hand.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 2, max: 2, allowCancel: false }
      ), selected => {
        cards = selected || [];

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON, name: 'Galarian Perrserker' },
          { min: 1, max: 1, allowCancel: true }
        ), selected => {
          cards = selected || [];
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards), () => state
          );
        });

        player.marker.addMarker(this.EVOLUTION_ROAR_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });

      });

    }

    return state;
  }

}