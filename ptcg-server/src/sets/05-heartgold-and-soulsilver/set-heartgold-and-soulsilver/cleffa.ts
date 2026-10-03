import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SpecialCondition } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, ShuffleDeckPrompt } from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect, AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cleffa extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 30;

  public retreat = [];

  public powers = [{
    name: 'Sweet Sleeping Face',
    powerType: PowerType.POKEBODY,
    text: 'As long as Cleffa is Asleep, prevent all damage done to Cleffa ' +
      'by attacks.'
  }];

  public attacks = [
    {
      name: 'Eeeeeeek',
      cost: [],
      damage: 0,
      text: 'Shuffle your hand into your deck, then draw 6 cards. Cleffa is ' +
        'now Asleep.'
    }
  ];

  public set: string = 'HS';

  public name: string = 'Cleffa';

  public fullName: string = 'Cleffa HS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '17';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Eeeeeeek
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.hand, player.deck, { sourceCard: this });

      const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
      specialCondition.target = player.active;
      store.reduceEffect(state, specialCondition);

      return store.prompt(state, [
        new ShuffleDeckPrompt(player.id)
      ], deckOrder => {
        player.deck.applyOrder(deckOrder);
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 6, sourceCard: this });
      });
    }

    // Sweet Sleeping Face
    if (effect instanceof PutDamageEffect) {
      if (effect.target.cards.includes(this)) {
        const pokemonCard = effect.target.getPokemonCard();
        const isAsleep = effect.target.specialConditions.includes(SpecialCondition.ASLEEP);
        if (pokemonCard === this && isAsleep) {
          // Try to reduce PowerEffect, to check if something is blocking our ability
          try {
            const stub = new PowerEffect(effect.player, {
              name: 'test',
              powerType: PowerType.ABILITY,
              text: ''
            }, this);
            store.reduceEffect(state, stub);
          } catch {
            return state;
          }
          effect.preventDefault = true;
        }
      }
    }

    return state;
  }

}
