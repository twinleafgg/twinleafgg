import { Card, CardList, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Slowpoke extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Rambunctious Party',
    cost: [C],
    damage: 0,
    text: 'Look at the top 5 cards of your deck. Choose as many Basic Pokémon as you like and put them onto your Bench. Shuffle the other cards back into your deck.'
  },
  {
    name: 'Rain Splash',
    cost: [W, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Slowpoke';
  public fullName: string = 'Slowpoke UD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const openSlots = player.bench.filter(b => b.cards.length === 0);

      if (openSlots.length === 0) {
        return state;
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      // Set maxPokemons to number of open slots
      const maxPokemons = Math.min(openSlots.length, deckTop.cards.filter(c => c instanceof PokemonCard && c.stage === Stage.BASIC).length);

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        deckTop,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: maxPokemons, allowCancel: false }
      ), selectedCards => {
        cards = selectedCards || [];

        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, deckTop, openSlots[index], { cards: [card], sourceCard: this });
          openSlots[index].pokemonPlayedTurn = state.turn;
        });
        MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    return state;
  }
}