import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Drifloon2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public powers = [{
    // Unburden
    name: 'Unburden',
    powerType: PowerType.POKEBODY,
    text: 'If Drifloon has a Pokémon Tool card attached to it, Drifloon\'s Retreat Cost is ColorlessColorless more.'
  }];

  public attacks = [{
    // Tackle
    name: 'Tackle',
    cost: [C],
    damage: 10,
    text: ''
  }, {
    // Big Explosion
    name: 'Big Explosion',
    cost: [P, C],
    damage: 50,
    text: 'Drifloon does 50 damage to itself.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH1';
  public name: string = 'Drifloon';
  public fullName: string = 'Drifloon SF2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Unburden
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      if (effect.player.active.tools.length > 0 && !IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        effect.cost.push(C, C);
      }
    }

    // Big Explosion
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 50);
    }

    return state;
  }
}
