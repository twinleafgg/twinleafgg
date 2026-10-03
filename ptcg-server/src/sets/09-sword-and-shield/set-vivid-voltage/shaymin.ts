import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';

import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Shaymin extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Leech Seed',
    cost: [G],
    damage: 20,
    text: 'Heal 20 damage from this Pokémon.'
  }, {
    name: 'Flower Bearing',
    cost: [G, C],
    damage: 0,
    text: 'Flip a coin. If heads, your opponent shuffles their Active Pokémon and all attached cards and puts them on the bottom of their deck.'
  }];

  public set: string = 'VIV';
  public setNumber = '15';
  public cardImage = 'assets/cardback.png';

  public regulationMark: string = 'D';

  public name: string = 'Shaymin';
  public fullName: string = 'Shaymin VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leech Seed
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const healingTime = new HealTargetEffect(effect, 20);
      healingTime.target = player.active;
      store.reduceEffect(state, healingTime);
    }

    // Flower Bearing
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result === true) {
          MOVE_CARDS(store, state, opponent.active, opponent.deck, { sourceCard: this });
          opponent.active.clearEffects();
        }
      });
    }

    return state;
  }
} 
