import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Latios extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C }];
  public retreat = [C, C];

  public powers = [{
    name: 'Luster Float',
    powerType: PowerType.POKEBODY,
    text: 'If you have Latias in play, the Retreat Cost for Latios is 0.'
  }];

  public attacks = [{
    name: 'Infinite Wing',
    cost: [C, C, C, C],
    damage: 80,
    text: 'Discard 2 Energy attached to Latios.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Latios';
  public fullName: string = 'Latios HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Luster Float
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (!IS_POKEBODY_BLOCKED(store, state, player, this)) {
        let hasLatias = false;
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
          if (card.name === 'Latias') {
            hasLatias = true;
          }
        });
        if (hasLatias) {
          effect.cost = [];
        }
      }
    }

    // Infinite Wing
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
    }

    return state;
  }
}
