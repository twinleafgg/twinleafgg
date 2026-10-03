import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Barraskewda extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 120;
  public retreat = [CardType.COLORLESS];
  public weakness = [{ type: CardType.LIGHTNING }];
  public evolvesFrom = 'Arrokuda';

  public attacks = [{
    name: 'Peck',
    cost: [CardType.COLORLESS],
    damage: 30,
    text: ''
  },
  {
    name: 'Spiral Jet',
    cost: [CardType.WATER],
    damage: 130,
    text: 'Discard 2 [W] Energy cards from your hand. If you don\'t, this attack does nothing.'
  }];

  public set: string = 'RCL';
  public setNumber: string = '53';
  public regulationMark = 'D';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Barraskewda';
  public fullName: string = 'Barraskewda RCL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let numberOfEnergy = 0;

      player.hand.cards.forEach(card => {
        if (card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC && card.name === 'Water Energy') {
          numberOfEnergy++;
        }
      });

      if (numberOfEnergy < 2) {
        effect.damage = 0;
        return state;
      }

      if (numberOfEnergy >= 2) {
        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { allowCancel: false, min: 2, max: 2 }
        ), cards => {
          cards = cards || [];

          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

          return state;

        });
      }

    }

    return state;
  }
}