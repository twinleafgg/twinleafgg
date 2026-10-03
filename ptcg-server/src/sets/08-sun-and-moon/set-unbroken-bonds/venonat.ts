import { PokemonCard, Stage, CardType, StoreLike, State, GameMessage, CardList, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Venonat extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 60;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Radar Eyes',
    cost: [G],
    damage: 0,
    text: 'Look at the top 7 cards of your deck and put 1 of them into your hand. Shuffle the other cards back into your deck.'
  },
  {
    name: 'Flop',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Venonat';
  public fullName: string = 'Venonat UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 7, sourceCard: this });

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected });
        MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });

        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}