import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Persian extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: F }];
  public retreat = [C];
  public evolvesFrom = 'Meowth';

  public attacks = [{
    name: 'Make \'Em Pay',
    cost: [C],
    damage: 20,
    text: ' If your opponent has 4 or more cards in their hand, they reveal their hand.'
    + 'Discard cards you find there until your opponent has exactly 4 cards in their hand. '
  }, {
    name: 'Sharp Claws',
    cost: [C, C],
    damage: 30,
    text: ' Flip a coin. If heads, this attack does 60 more damage.'
  }];

  public set = 'TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '126';
  public name = 'Persian';
  public fullName = 'Persian TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];

      if (opponent.hand.cards.length >= 4) {
        const minMaxDiscardAmt = opponent.hand.cards.length - 4;

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          { min: minMaxDiscardAmt, max: minMaxDiscardAmt, allowCancel: false }
        ), selected => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          effect.damage += 60;
        }
      });
    }

    return state;
  }

}