import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Decidueye extends PokemonCard {

  public regulationMark = 'H';
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Dartrix';
  public cardType: CardType[] = [G];
  public hp: number = 150;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Stock Up on Feathers',
      cost: [C],
      damage: 0,
      text: 'Draw cards until you have 7 cards in your hand.'
    },
    {
      name: 'Power Shot',
      cost: [G],
      damage: 170,
      text: 'Discard a Basic [G] Energy from your hand. If you can\'t, this attack does nothing.'
    }
  ];

  public set: string = 'SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Decidueye';
  public fullName: string = 'Decidueye SFA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      while (player.hand.cards.length < 7) {
        if (player.deck.cards.length === 0) {
          break;
        }
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Prompt player to choose cards to discard 
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
        { allowCancel: false, min: 0, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          effect.damage = 0;
          return state;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        return state;
      });
    }
    return state;
  }
}