import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Slakoth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Flail',
    cost: [C],
    damage: 10,
    damageCalculation: 'x',
    text: 'Does 10 damage times the number of damage counters on Slakoth.'
  }, {
    name: 'Slack Off',
    cost: [C, C],
    damage: 0,
    text: 'Remove all damage counters from Slakoth. Slakoth can\'t attack during your next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Slakoth';
  public fullName: string = 'Slakoth PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = effect.player.active.damage;
    }

    // Slack Off
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const healEffect = new HealEffect(player, player.active, player.active.damage);
      store.reduceEffect(state, healEffect);
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(player);
    }

    return state;
  }
}
