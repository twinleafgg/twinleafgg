import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, PowerType, GameError, CardList, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Claydol extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Baltoy';
  public cardType: CardType[] = [F];
  public hp: number = 80;
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Cosmic Power',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may choose up to 2 cards from your hand and put them on the bottom of your deck in any order. If you do, draw cards until you have 6 cards in your hand. This power can\'t be used if Claydol is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Spinning Attack',
    cost: [F, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'GE';
  public setNumber: string = '15';
  public name: string = 'Claydol';
  public fullName: string = 'Claydol GE';
  public cardImage: string = 'assets/cardback.png';

  public readonly COSMIC_POWER_MARKER = 'COSMIC_POWER_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.COSMIC_POWER_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.COSMIC_POWER_MARKER, this)) {
      const player = effect.player;
      player.marker.removeMarker(this.COSMIC_POWER_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.marker.hasMarker(this.COSMIC_POWER_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.hand.cards.length == 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const deckBottom = new CardList();

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARDS_TO_PUT_ON_BOTTOM_OF_THE_DECK,
        player.hand,
        {},
        { allowCancel: false, min: 1, max: 2 }
      ), selected => {
        MOVE_CARDS(store, state, player.hand, deckBottom, { cards: selected, sourceCard: this });
        MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });

        while (player.hand.cards.length < 6) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      });

      player.marker.addMarker(this.COSMIC_POWER_MARKER, this);

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

    }

    return state;
  }

}
