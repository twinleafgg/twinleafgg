import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Seadra extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Horsea';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: 20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Aqua Pump',
    cost: [W],
    damage: 30,
    damageCalculation: '+',
    text: 'You may discard up to 2 [W] Energy cards from your hand. If you do, this attack does 30 damage plus 10 more damage for each Energy card you discarded.'
  },
  {
    name: 'Waterfall',
    cost: [W, W, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Seadra';
  public fullName: string = 'Seadra LA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Aqua Pump
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const energiesInHand = player.hand.cards.filter(
        (card) => card.superType === SuperType.ENERGY,
      );
      // Prompt player to choose cards to discard
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: energiesInHand.length },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
          effect.damage += cards.length * 10;
          return state;
        },
      );
    }

    return state;
  }
}
