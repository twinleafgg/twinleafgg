import { ChoosePokemonPrompt, EnergyCard, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AddSpecialConditionsEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lapras extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 120;

  public weakness = [{ type: CardType.LIGHTNING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Icy Wind',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Your opponent\'s Active Pokémon is now Asleep.'
    }, {
      name: 'Splash Arch',
      cost: [CardType.WATER, CardType.WATER, CardType.COLORLESS],
      damage: 0,
      text: 'Put all Energy attached to this Pokémon into your hand. This attack does 100 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
    },
  ];

  public set: string = 'FST';

  public regulationMark = 'E';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '54';

  public name: string = 'Lapras';

  public fullName: string = 'Lapras FST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      const attachedEnergy = effect.source.cards.filter(c => c instanceof EnergyCard);

      for (const energy of attachedEnergy) {
        MOVE_CARDS(store, state, player.active, player.hand, { cards: [energy], sourceCard: this });
      }

      const opponent = StateUtils.getOpponent(state, player);
      const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);

      const min = Math.min(1, benched);
      const max = Math.min(1, benched);

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: min, max, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        targets.forEach(target => {
          const damageEffect = new PutDamageEffect(effect, 100);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        });

        return state;
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const sleepEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
      store.reduceEffect(state, sleepEffect);
    }
    return state;
  }
}