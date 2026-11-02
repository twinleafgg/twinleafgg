import { PokemonCard, CardType, SpecialCondition, Stage, PowerType, State, StateUtils, StoreLike } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Suicune extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [{
    // Mirror Coat
    name: 'Mirror Coat',
    powerType: PowerType.POKEBODY,
    text: 'If Suicune is Burned or Poisoned by an opponent\'s attack (even if Suicune is Knocked Out), the Attacking Pokémon is now affected by the same Special Conditions (1 if there is only 1).'
  }];

  public attacks = [{
    // Bubblebeam
    name: 'Bubblebeam',
    cost: [W, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Suicune';
  public fullName: string = 'Suicune P2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mirror Coat
    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const reflected = effect.specialConditions.filter(c =>
        c === SpecialCondition.BURNED || c === SpecialCondition.POISONED
      );
      if (reflected.length === 0) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, owner);
      const copy = new AddSpecialConditionsEffect(effect.attackEffect, reflected);
      copy.target = opponent.active;
      store.reduceEffect(state, copy);
    }
    // Bubblebeam
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
