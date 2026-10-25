import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';

export class Ariados extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Spinarak';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Leech Life',
    cost: [G, C],
    damage: 30,
    text: 'Remove from Ariados the number of damage counters equal to the damage you did to the Defending Pokémon.'
  },
  {
    name: 'Poisonous Saliva',
    cost: [G, C, C],
    damage: 50,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Ariados';
  public fullName: string = 'Ariados HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leech Life
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[0]
      && effect.damage > 0
      && effect.player.active.getPokemonCard() === this) {
      store.reduceEffect(state, new HealEffect(effect.player, effect.player.active, effect.damage));
    }

    // Poisonous Saliva
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
