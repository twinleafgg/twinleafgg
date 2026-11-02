import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sceptile2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Grovyle';
  public hp: number = 130;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Leaf Supply',
    cost: [G],
    damage: 30,
    text: 'You may attach a basic Energy card from your hand to 1 of your Pokémon.'
  }, {
    name: 'Dual Cut',
    cost: [G, C, C],
    damage: 70,
    damageCalculation: 'x',
    text: 'Flip 2 coins. This attack does 70 damage times the number of heads.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Sceptile';
  public fullName: string = 'Sceptile AR2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leaf Supply
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        effect.player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.HAND,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 1, allowCancel: true }
      );
    }

    // Dual Cut
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        effect.damage = 70 * results.filter(r => r).length;
      });
    }

    return state;
  }
}
