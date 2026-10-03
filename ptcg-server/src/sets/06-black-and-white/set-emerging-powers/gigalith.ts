import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Gigalith extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Boldore';
  public cardType: CardType[] = [F];
  public hp: number = 140;
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Shear',
      cost: [F],
      damage: 0,
      text: 'Discard the top 5 cards of your deck. If any of those cards are [F] Energy cards, attach them to this Pokémon.'
    },
    {
      name: 'Rock Bullet',
      cost: [C, C, C, C],
      damage: 40,
      damageCalculation: '+',
      text: 'Does 20 more damage for each [F] Energy attached to this Pokémon.'
    }
  ];

  public set: string = 'EPO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Gigalith';
  public fullName: string = 'Gigalith EPO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const cardsToDiscard = player.deck.cards.slice(0, 5);

      cardsToDiscard.forEach(card => {
        if (card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC && card.name === 'Fighting Energy') {
          MOVE_CARDS(store, state, player.deck, player.active, { cards: [card], sourceCard: this });
        } else {
          MOVE_CARDS(store, state, player.deck, player.discard, { cards: [card], sourceCard: this });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);

      let fightingEnergy = 0;
      checkEnergy.energyMap.forEach(em => {
        fightingEnergy += em.provides.filter(p => p === CardType.FIGHTING).length;
      });

      (effect as AttackEffect).damage += 20 * fightingEnergy;
    }

    return state;
  }
}
