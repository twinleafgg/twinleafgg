import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { DISCARD_ALL_ENERGY_FROM_POKEMON } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Recharge',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, search your deck for a Lightning Energy card and attach it to Pikachu. Shuffle your deck afterward.'
  }, {
    name: 'Thunderbolt',
    cost: [L, L, C, C],
    damage: 100,
    text: 'Discard all Energy attached to Pikachu.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Recharge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          ATTACH_ENERGY_PROMPT(
            store,
            state,
            player,
            PlayerType.BOTTOM_PLAYER,
            SlotType.DECK,
            [SlotType.ACTIVE],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
            { min: 0, max: 1, allowCancel: true }
          );
        }
      });
    }

    // Thunderbolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
    }

    return state;
  }
}
