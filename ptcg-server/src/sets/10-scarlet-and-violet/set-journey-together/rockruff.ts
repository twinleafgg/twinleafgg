import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, CardList, GameMessage, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ConfirmCardsPrompt } from '../../../game/store/prompts/confirm-cards-prompt';
import {BLOCK_IF_DECK_EMPTY, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Rockruff extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public regulationMark = 'I';
  public cardType: CardType[] = [F];
  public hp: number = 70;
  public weakness = [{ type: G }];
  public resistance = [];
  public retreat = [C];

  public attacks = [
    {
      name: 'Dig It Up',
      cost: [C],
      damage: 0,
      text: 'Look at the top card of your deck. You may discard that card.'
    },
    { name: 'Stampede', cost: [C, C], damage: 20, text: '' },
  ];

  public set: string = 'JTG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Rockruff';
  public fullName: string = 'Rockruff JTG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      BLOCK_IF_DECK_EMPTY(player);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 1, sourceCard: this });

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });

      return store.prompt(state, new ConfirmCardsPrompt(
        player.id,
        GameMessage.DISCARD_FROM_TOP_OF_DECK,
        deckTop.cards, // Fix error by changing toArray() to cards
        { allowCancel: true },
      ), selected => {

        if (selected !== null) {
          // Discard card
          MOVE_CARDS(store, state, deckTop, player.discard, { cards: deckTop.cards, sourceCard: this });
        } else {
          // Move back to the top of your deck
          deckTop.moveToTopOfDestination(player.deck);
        }
      });
    }
    return state;
  }
}