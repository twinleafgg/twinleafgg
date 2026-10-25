import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_UP_TO_X_ENERGY_FROM_YOUR_POKEMON } from '../../../game/store/prefabs/costs';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Infernape extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Monferno';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +30 }];
  public retreat = [];

  public attacks = [{
    name: 'Rushing Flames',
    cost: [R],
    damage: 80,
    damageCalculation: 'x',
    text: 'Discard as many Fire Energy cards as you like attached to your Pokémon in play. Flip a coin for each Energy card you discarded. This attack does 80 damage times the number of heads.'
  }, {
    name: 'Rage',
    cost: [C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each damage counter on Infernape.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Infernape';
  public fullName: string = 'Infernape PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rushing Flames
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = 0;
      return DISCARD_UP_TO_X_ENERGY_FROM_YOUR_POKEMON(
        store,
        state,
        effect,
        99,
        { energyType: EnergyType.BASIC, name: 'Fire Energy' },
        0,
        [SlotType.ACTIVE, SlotType.BENCH],
        transfers => {
          if (transfers.length === 0) {
            return;
          }
          MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, transfers.length, results => {
            effect.damage = 80 * results.filter(r => r).length;
          });
        }
      );
    }

    // Rage
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage += effect.player.active.damage;
    }

    return state;
  }
}
