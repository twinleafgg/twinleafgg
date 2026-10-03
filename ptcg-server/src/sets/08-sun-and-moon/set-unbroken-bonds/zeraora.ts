import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, GameMessage, EnergyCard, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Zeraora extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.LIGHTNING];
  public hp: number = 120;
  public weakness = [{ type: CardType.FIGHTING }];
  public resistance = [{ type: CardType.METAL, value: -20 }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Crushing Claw',
    cost: [CardType.LIGHTNING],
    damage: 20,
    text: 'Discard a Special Energy from your opponent\'s Active Pokémon.'
  },
  {
    name: 'Discharge',
    cost: [CardType.LIGHTNING, CardType.COLORLESS, CardType.COLORLESS],
    damage: 50,
    text: 'Discard all [L] Energy from this Pokémon. This attack does 50 damage for each card you discarded in this way. '
  }];

  public set: string = 'UNB';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zeraora';
  public fullName: string = 'Zeraora UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active;

      let hasSpecialEnergy = false;

      // Checking to see if Opp active has any special energy
      opponentActive.cards.forEach(c => {
        if (c instanceof EnergyCard) {
          if (c.energyType === EnergyType.SPECIAL) {
            hasSpecialEnergy = true;
          }
        }
      });

      // If no special energy, pass turn, else, ask player to pick a special energy to discard from Opp active
      if (!hasSpecialEnergy) {
        return state;
      } else {
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          opponentActive, // Card source is target Pokemon
          { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
          { max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            const discardEnergy = new DiscardCardsEffect(effect, cards);
            discardEnergy.target = opponentActive;
            MOVE_CARDS(store, state, opponentActive, opponent.discard, { cards: cards, sourceCard: this });
            return state;
          }
          return state;
        });

      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      let totalDiscarded = 0;

      const cards: Card[] = checkProvidedEnergy.energyMap.map(e => e.card);
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;

      totalDiscarded += discardEnergy.cards.length;

      store.reduceEffect(state, discardEnergy);

      effect.damage += (totalDiscarded - 1) * 50;
    }

    return state;
  }
}