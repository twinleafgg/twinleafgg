import { PokemonCard, CardType, Stage, EnergyCard, PowerType, State, StateUtils, StoreLike } from '../../game';
import { AbstractAttackEffect, ApplyWeaknessEffect, DealDamageEffect, PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Mew extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    // Reactive Barrier
    name: 'Reactive Barrier',
    powerType: PowerType.POKEBODY,
    text: 'As long as Mew has any React Energy cards attached to it, prevent all effects, excluding damage, done to Mew by attacks from your opponent\'s Pokémon.'
  }];

  public attacks = [{
    // Psyshock
    name: 'Psyshock',
    cost: [P, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Mew';
  public fullName: string = 'Mew P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reactive Barrier
    if (effect instanceof AbstractAttackEffect && effect.target.cards.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.getOpponent(state, player);
      if (effect.player !== opponent) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const hasReactEnergy = effect.target.cards.some(c => c instanceof EnergyCard && c.name === 'React Energy');
      if (!hasReactEnergy) {
        return state;
      }
      if (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect || effect instanceof ApplyWeaknessEffect) {
        return state;
      }
      effect.preventDefault = true;
    }
    // Psyshock
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    return state;
  }
}
