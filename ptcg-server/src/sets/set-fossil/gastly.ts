import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SpecialCondition, SuperType } from '../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt, EnergyCard } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { AddSpecialConditionsEffect, DealDamageEffect } from '../../game/store/effects/attack-effects';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Gastly extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public resistance = [{ type: F, value: -30 }];

  public attacks = [{
    name: 'Lick',
    cost: [P],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed'
  }, {
    name: 'Energy Conversion',
    cost: [P, P],
    damage: 0,
    text: 'Put up to 2 Energy cards from your discard pile into your hand. Gastly does 10 damage to itself.'
  }];

  public set: string = 'FO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Gastly';
  public fullName: string = 'Gastly FO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      state = COIN_FLIP_PROMPT(store, state, player, results => {
        if (results) {
          const specialConditionEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.PARALYZED]);
          store.reduceEffect(state, specialConditionEffect);
        }
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let energyCards = 0;
      player.discard.cards.forEach(c => {
        if (c instanceof EnergyCard) {
          energyCards++;
        }
      });

      if (energyCards === 0) {
        return state;
      }

      const min = Math.min(energyCards, 2);
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.ENERGY },
        { min, max: min, allowCancel: true }
      ), cards => {
        cards = cards || [];
        if (cards.length > 0) {
          // Recover discarded Pokemon
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        }
      });

      const dealDamage = new DealDamageEffect(effect, 10);
      dealDamage.target = player.active;
      return store.reduceEffect(state, dealDamage);
    }

    return state;
  }
}