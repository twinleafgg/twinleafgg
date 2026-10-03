import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Wimpod extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 70;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Sneaky Snacking',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, discard a random card from your opponent\'s hand.'
  }, {
    name: 'Ram',
    cost: [W, C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'PAR';

  public regulationMark = 'G';

  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Wimpod';
  public fullName: string = 'Wimpod PAR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sneaky Snacking
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result === false) {
          return state;
        }
      });

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        {},
        { allowCancel: false, min: 1, max: 1, isSecret: true }
      ), cards => {
        cards = cards || [];

        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
      });
    }

    return state;
  }
}
