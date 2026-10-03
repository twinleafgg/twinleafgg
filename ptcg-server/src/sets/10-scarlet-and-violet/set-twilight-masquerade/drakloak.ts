import { BoardEffect, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CardList } from '../../../game/store/state/card-list';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import { GameError, PlayerType, PokemonCard, PowerType } from '../../../game';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Drakloak extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Dreepy';

  public regulationMark = 'H';

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 90;

  public weakness = [];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Recon Directive',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may look at the top 2 cards of your deck and put 1 of them into your hand. Put the other card on the bottom of your deck.'
  }];

  public attacks = [
    {
      name: 'Dragon Headbutt',
      cost: [CardType.FIRE, CardType.PSYCHIC],
      damage: 70,
      text: ''
    }
  ];

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '129';

  public name: string = 'Drakloak';

  public fullName: string = 'Drakloak TWM';

  public readonly TELLING_SPIRIT_MARKER = 'TELLING_SPIRIT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.TELLING_SPIRIT_MARKER, this);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.TELLING_SPIRIT_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const deckBottom = new CardList();
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 2, sourceCard: this });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        player.marker.addMarker(this.TELLING_SPIRIT_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
        MOVE_CARDS(store, state, deckTop, deckBottom, { sourceCard: this });
        MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });
        return state;
      });
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.TELLING_SPIRIT_MARKER, this)) {
      effect.player.marker.removeMarker(this.TELLING_SPIRIT_MARKER, this);
    }

    return state;
  }
}
