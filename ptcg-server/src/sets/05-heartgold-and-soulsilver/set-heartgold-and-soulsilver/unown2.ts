import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardList, GameMessage, OrderCardsPrompt, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Unown2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'FLASH',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Unown from your hand onto your Bench, you may look at the top 5 cards of your deck and put them back on top of your deck in any order.'
  }];

  public attacks = [{
    name: 'Hidden Power',
    cost: [P],
    damage: 10,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Unown';
  public fullName: string = 'Unown HS2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // FLASH
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (effect.target === player.active) {
        return state;
      }
      if (IS_POKEPOWER_BLOCKED(store, state, player, this) || player.deck.cards.length === 0) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }

        const deckTop = new CardList();
        MOVE_CARDS(store, state, player.deck, deckTop, {
          count: Math.min(5, player.deck.cards.length),
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
          deckTop.moveToTopOfDestination(player.deck);
        });
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    return state;
  }
}
