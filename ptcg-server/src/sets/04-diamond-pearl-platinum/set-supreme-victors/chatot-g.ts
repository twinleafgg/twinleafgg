import { CardList, ChooseCardsPrompt, GameMessage, OrderCardsPrompt, PowerType, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ChatotG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Disrupting Spy',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Chatot G from your hand onto your Bench, you may look at the top 4 cards of your opponent\'s deck. Put them back on top of your opponent\'s deck in any order.'
  }];

  public attacks = [{
    name: 'Search and Escape',
    cost: [],
    damage: 0,
    text: 'Search your deck for a Trainer card, show it to your opponent, and put it into your hand. Put Chatot G and all cards attached to it on top of your deck. Shuffle your deck afterward.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '54';
  public name: string = 'Chatot G';
  public fullName: string = 'Chatot G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Disrupting Spy
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (effect.target === player.active) {
        return state;
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.deck.cards.length === 0) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }
        const deckTop = new CardList();
        MOVE_CARDS(store, state, opponent.deck, deckTop, {
          count: Math.min(4, opponent.deck.cards.length),
          sourceCard: this,
        });
        store.prompt(state, new OrderCardsPrompt(
          player.id,
          GameMessage.CHOOSE_CARDS_ORDER,
          deckTop,
          { allowCancel: false }
        ), order => {
          if (order !== null) {
            deckTop.applyOrder(order);
          }
          deckTop.moveToTopOfDestination(opponent.deck);
        });
      });
    }

    // Search and Escape
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slot = StateUtils.findCardList(state, this);
      const returnChatot = () => {
        MOVE_CARDS(store, state, slot, player.deck, { sourceCard: this, sourceEffect: this.attacks[0] });
        SHUFFLE_DECK(store, state, player);
      };

      if (player.deck.cards.length === 0) {
        returnChatot();
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this, sourceEffect: this.attacks[0] });
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        }
        returnChatot();
      });
    }

    return state;
  }
}
