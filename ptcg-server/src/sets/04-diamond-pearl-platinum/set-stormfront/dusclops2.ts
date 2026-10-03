import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Stage, CardType } from '../../../game/store/card/card-types';
import {WAS_ATTACK_USED, AFTER_ATTACK, CONFIRMATION_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';

export class Dusclops2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Duskull';
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Dark One-eye',
    cost: [P],
    damage: 20,
    text: 'You may discard a card from your hand. If you do, your opponent discards a card from his or her hand.'
  },
  {
    name: 'Ambush',
    cost: [P, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'SF';
  public name: string = 'Dusclops';
  public fullName: string = 'Dusclops SF 34';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          if (player.hand.cards.length > 0) {
            store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              player.hand,
              {},
              { min: 1, max: 1, allowCancel: false }
            ), selected => {
              const cards = selected || [];
              MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
            });
          }
          if (opponent.hand.cards.length > 0) {
            store.prompt(state, new ChooseCardsPrompt(
              opponent,
              GameMessage.CHOOSE_CARD_TO_DISCARD,
              opponent.hand,
              {},
              { min: 1, max: 1, allowCancel: false }
            ), selected => {
              const cards = selected || [];
              MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
            });
          }
        }
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }

} 