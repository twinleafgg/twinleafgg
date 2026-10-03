import { PokemonCard, Stage, CardType, PowerType, State, StoreLike, StateUtils, ConfirmPrompt, GameLog, GameMessage, PlayerType, Card, ChooseCardsPrompt, ShuffleDeckPrompt, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MovedFromActiveToBenchEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {MOVED_FROM_ACTIVE_TO_BENCH_THIS_TURN, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Palafin extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Finizen';
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [{
    name: 'Zero to Hero',
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, when this Pokémon moves from the Active Spot to the Bench, you may search your deck for a Palafin ex and switch it with this Pokémon. Any attached cards, damage counters, Special Conditions, turns in play, and any other effects remain on the new Pokémon. If you switched a Pokémon in this way, put this card into your deck. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Wave Splash',
    cost: [W, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'TWM';
  public setNumber: string = '60';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public fullName: string = 'Palafin TWM';
  public name: string = 'Palafin';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedFromActiveToBenchEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_FROM_ACTIVE_TO_BENCH_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
        return state;
      }

      try {
        const stub = new PowerEffect(player, {
          name: 'test',
          powerType: PowerType.ABILITY,
          text: ''
        }, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        player.marker.addMarker(this.ABILITY_USED_MARKER, this);

        if (!wantToUse) {
          return;
        }

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, { name: player.name, ability: 'Zero to Hero' });
          }
        });

        if (player.deck.cards.length === 0) {
          return;
        }

        const cardList = StateUtils.findCardList(state, this);

        let cards: Card[] = [];
        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_EVOLVE,
          player.deck,
          { superType: SuperType.POKEMON, name: 'Palafin ex' },
          { min: 0, max: 1, allowCancel: false }
        ), selected => {
          cards = (selected || []) as PokemonCard[];

          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, cardList, { cards: [cards[0]], sourceCard: this });
            MOVE_CARDS(store, state, cardList, player.deck, { cards: [this], sourceCard: this });
          }

          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        });
      });
    }
    return state;
  }
}
