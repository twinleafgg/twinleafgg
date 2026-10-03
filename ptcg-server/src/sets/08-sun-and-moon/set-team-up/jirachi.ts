import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, SpecialCondition, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, GameError, GameMessage, StateUtils, CardList, ChooseCardsPrompt, ShowCardsPrompt, ShuffleDeckPrompt, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Jirachi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.METAL];
  public hp: number = 70;
  public weakness = [{ type: CardType.FIRE }];
  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];
  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Stellar Wish',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pokemon is your Active Pokemon, you may look at the top 5 cards of your deck, reveal a Trainer card you find there, and put it into your hand. Then, shuffle the other cards back into your deck, and this Pokemon is now Asleep.'
  }];

  public attacks = [{
    name: 'Slap',
    cost: [CardType.METAL, CardType.COLORLESS],
    damage: 30,
    text: ''
  }];

  public set: string = 'TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '99';
  public name: string = 'Jirachi';
  public fullName: string = 'Jirachi TEU';

  public readonly STELLAR_WISH_MARKER = 'STELLAR_WISH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.STELLAR_WISH_MARKER, this);
      return state;
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.STELLAR_WISH_MARKER, this)) {
      effect.player.marker.removeMarker(this.STELLAR_WISH_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.STELLAR_WISH_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] !== this) {
        return state; // Not active
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });
      const opponent = StateUtils.getOpponent(state, player);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        { superType: SuperType.TRAINER },
        { min: 0, max: 1, allowCancel: false }
      ), selected => {
        player.marker.addMarker(this.STELLAR_WISH_MARKER, this);
        MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
        MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            cardList.addSpecialCondition(SpecialCondition.ASLEEP);
          }
        });

        if (selected.length > 0) {
          return store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            selected
          ), () => {
          });
        }
        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }
    return state;
  }
}