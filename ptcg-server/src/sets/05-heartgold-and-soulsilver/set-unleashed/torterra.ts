import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';

export class Torterra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Grotle';
  public hp: number = 140;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Giga Drain',
    cost: [G, C, C],
    damage: 40,
    text: 'Remove from Torterra the number of damage counters equal to the damage you did to the Defending Pokémon.'
  },
  {
    name: 'Land Crush',
    cost: [G, C, C, C],
    damage: 80,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Torterra';
  public fullName: string = 'Torterra UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Giga Drain
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[0]
      && effect.damage > 0
      && effect.player.active.getPokemonCard() === this) {
      store.reduceEffect(state, new HealEffect(effect.player, effect.player.active, effect.damage));
    }

    return state;
  }
}
