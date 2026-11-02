import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';

export class Turtwig extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Leech Seed',
    cost: [G],
    damage: 10,
    text: 'If this attack does any damage to the Defending Pokémon (after applying Weakness and Resistance), remove 1 damage counter from Turtwig.'
  },
  {
    name: 'Ram',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Turtwig';
  public fullName: string = 'Turtwig UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leech Seed
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[0]
      && effect.damage > 0
      && effect.player.active.getPokemonCard() === this) {
      store.reduceEffect(state, new HealEffect(effect.player, effect.player.active, 10));
    }

    return state;
  }
}
