import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { GamePhase } from '../../../game/store/state/state';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shuckle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [{
    name: 'Shell Barricade',
    powerType: PowerType.POKEBODY,
    text: 'As long as Shuckle is on your Bench, prevent all damage done to Shuckle by attacks (both yours and your opponent\'s).'
  }];

  public attacks = [{
    name: 'Poison Jab',
    cost: [F, F],
    damage: 30,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Shuckle';
  public fullName: string = 'Shuckle HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shell Barricade
    if ((effect instanceof DealDamageEffect || effect instanceof PutDamageEffect)
      && effect.target.cards.includes(this)
      && effect.target.getPokemonCard() === this
      && state.phase === GamePhase.ATTACK) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (owner.active.getPokemonCard() === this) {
        return state;
      }
      if (!StateUtils.isPokemonInPlay(owner, this)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      if (effect instanceof DealDamageEffect) {
        effect.damage = 0;
      } else {
        effect.preventDefault = true;
      }
    }

    // Poison Jab
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
