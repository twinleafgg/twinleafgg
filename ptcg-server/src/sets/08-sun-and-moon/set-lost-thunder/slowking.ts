import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, Card, CardList, ChooseCardsPrompt, GameMessage, GameLog, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Slowking extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 120;
  public weakness = [{ type: CardType.GRASS }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];
  public evolvesFrom = 'Slowpoke';

  public attacks = [{
    name: 'Memory Melt',
    cost: [CardType.WATER],
    damage: 0,
    text: 'Look at your opponent\'s hand and put a card you find there in the Lost Zone.'
  },
  {
    name: 'Psychic',
    cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
    damage: 60,
    text: 'This attack does 20 more damage times the amount of Energy attached to your opponent\'s Active Pokémon.'
  }];

  public set: string = 'LOT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Slowking';
  public fullName: string = 'Slowking LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      let cards: Card[] = [];

      cards = opponent.hand.cards;

      // prepare card list without Junk Arm
      const handTemp = new CardList();
      handTemp.cards = opponent.hand.cards;

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        handTemp,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          return state;
        }

        MOVE_CARDS(store, state, opponent.hand, opponent.lostzone, { cards: [cards[0]], sourceCard: this });

        cards.forEach((card, index) => {
          store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_LOST_ZONE, { name: opponent.name, card: card.name });
        });
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let energyAmount = 0;

      opponent.active.cards.forEach(c => {
        if (c instanceof EnergyCard) {
          energyAmount++;
        }
      });

      effect.damage += 20 * energyAmount;
    }

    return state;
  }
}