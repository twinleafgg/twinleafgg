import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, BLOCK_IF_DISCARD_EMPTY, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Lillipup2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Pickup',
      cost: [C],
      damage: 0,
      text: 'Choose a card from your discard pile and shuffle it into your deck.'
    },
    {
      name: 'Tackle',
      cost: [C, C],
      damage: 20,
      text: ''
    }
  ];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Lillipup';
  public fullName: string = 'Lillipup BLW 81';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_DISCARD_EMPTY(player);

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        }
      });
    }
    return state;
  }
}
