import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt, CardList, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHOW_CARDS_TO_PLAYER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Eevee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Fetch and Hide',
    cost: [C],
    damage: 0,
    text: 'Your opponent reveals their hand, and you put an Item card you find there on the bottom of your opponent\'s deck.'
  }, {
    name: 'Tackle',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '116';
  public name: string = 'Eevee';
  public fullName: string = 'Eevee 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fetch and Hide
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const opponentHandSnapshot = [...opponent.hand.cards];
      SHOW_CARDS_TO_PLAYER(store, state, player, opponentHandSnapshot);

      const hasItem = opponent.hand.cards.some(c =>
        c instanceof TrainerCard && c.trainerType === TrainerType.ITEM
      );

      if (!hasItem) {
        return state;
      }

      const blocked: number[] = [];
      opponent.hand.cards.forEach((c, index) => {
        if (!(c instanceof TrainerCard) || c.trainerType !== TrainerType.ITEM) {
          blocked.push(index);
        }
      });

      const deckBottom = new CardList();
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        opponent.hand,
        {},
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, opponent.hand, deckBottom, { cards: [selected[0]], sourceCard: this });
          MOVE_CARDS(store, state, deckBottom, opponent.deck, { sourceCard: this });
        }
      });
    }

    return state;
  }
}
