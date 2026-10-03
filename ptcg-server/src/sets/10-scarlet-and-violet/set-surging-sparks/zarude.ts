import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ConfirmPrompt, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Zarude extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 120;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Leaf Drain',
      cost: [CardType.GRASS],
      damage: 20,
      text: 'Heal 20 damage from this Pokémon.'
    },

    {
      name: 'Jungle Whip',
      cost: [CardType.GRASS, CardType.GRASS, CardType.COLORLESS],
      damage: 80,
      text: 'You may put all Energy attached to this Pokémon into your hand to have this attack do 80 more damage.'
    }
  ];

  public set: string = 'SSP';

  public setNumber = '11';

  public cardImage = 'assets/cardback.png';

  public regulationMark: string = 'H';

  public name: string = 'Zarude';

  public fullName: string = 'Zarude SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const healingTime = new HealTargetEffect(effect, 20);
      healingTime.target = player.active;
      store.reduceEffect(state, healingTime);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
          state = store.reduceEffect(state, checkProvidedEnergy);

          const cards: Card[] = [];
          checkProvidedEnergy.energyMap.forEach(em => {
            cards.push(em.card);
          });

          MOVE_CARDS(store, state, player.active, player.hand, { cards: cards, sourceCard: this });

          effect.damage += 80;
        }
      });
    }
    return state;
  }
} 
