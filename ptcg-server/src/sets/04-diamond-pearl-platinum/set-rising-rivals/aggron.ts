import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { RemoveSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { CONFIRMATION_PROMPT, DISCARD_TOP_X_CARDS_FROM_YOUR_DECK, HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Aggron extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Lairon';
  public hp: number = 130;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Return Blow',
    cost: [C, C],
    damage: 0,
    text: 'If Aggron was damaged by an attack during your opponent\'s last turn, this attack does the same amount of damage done to Aggron to the Defending Pokémon.'
  }, {
    name: 'Metal Fang',
    cost: [M, C, C],
    damage: 40,
    text: 'You may discard the top card of your deck. If you do, remove 2 damage counters and all Special Conditions from Aggron.'
  }, {
    name: 'Heavy Impact',
    cost: [M, M, C, C],
    damage: 70,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Aggron';
  public fullName: string = 'Aggron RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Return Blow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = this.damageTakenLastTurn ?? 0;
    }

    // Metal Fang
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      return CONFIRMATION_PROMPT(store, state, player, wantTo => {
        if (wantTo) {
          DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, player, 1, this, effect);
          HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
          const removeSpecialCondition = new RemoveSpecialConditionsEffect(effect, undefined);
          removeSpecialCondition.target = player.active;
          store.reduceEffect(state, removeSpecialCondition);
        }
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    return state;
  }
}
