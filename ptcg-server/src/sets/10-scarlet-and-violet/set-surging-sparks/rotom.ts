import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, ShowCardsPrompt, GameMessage, TrainerCard, CardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Rotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Crushing Pulse',
      cost: [L],
      damage: 0,
      text: 'Your opponent reveals their hand. Discard all Item cards and Pokémon Tool cards you find there.'
    },
    {
      name: 'Energy Short',
      cost: [L],
      damage: 20,
      damageCalculation: 'x',
      text: 'This attack does 20 damage for each Energy attached to your opponent\'s Active Pokémon.'
    },
  ];

  public set: string = 'SSP';
  public regulationMark: string = 'H';
  public setNumber: string = '61';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Rotom';
  public fullName: string = 'Rotom SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Crushing Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const escrow = new CardList;

      store.prompt(state, new ShowCardsPrompt(
        player.id,
        GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
        opponent.hand.cards
      ), () => {
        opponent.hand.cards.forEach(card => {
          if (card instanceof TrainerCard && (card.trainerType === TrainerType.ITEM || card.trainerType === TrainerType.TOOL)) {
            MOVE_CARDS(store, state, opponent.hand, escrow, { cards: [card], sourceCard: this });
          }
        });

        MOVE_CARDS(store, state, escrow, opponent.discard, { sourceCard: this });
      });

    }

    // Energy Short
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;

      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap
        .reduce((left, p) => left + p.provides.length, 0);

      effect.damage = opponentEnergyCount * 20;
    }

    return state;
  }

}
