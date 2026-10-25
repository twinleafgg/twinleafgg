import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ATTACH_ENERGY_PROMPT, COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shaymin2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Growth',
    cost: [],
    damage: 0,
    text: 'Attach a Grass Energy card from your hand to Shaymin.'
  }, {
    name: 'Air Slash',
    cost: [C, C],
    damage: 40,
    text: 'Flip a coin. If tails, discard an Energy attached to Shaymin.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Shaymin';
  public fullName: string = 'Shaymin PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Growth
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        effect.player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.HAND,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
        { min: 0, max: 1, allowCancel: true }
      );
    }

    // Air Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
        }
      });
    }

    return state;
  }
}
