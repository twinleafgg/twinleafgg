import { CardType, EnergyType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_UP_TO_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ADD_PARALYZED_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Electivire extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Electabuzz';
  public cardType: CardType[] = [L];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Body Slam',
    cost: [C, C],
    damage: 30,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }, {
    name: 'Voltaic Hammer',
    cost: [L, L, C, C],
    damage: 60,
    damageCalculation: 'x',
    text: 'Discard any amount of Basic Energy from this Pokémon, and this attack does 60 damage for each card you discarded in this way.'
  }];

  public regulationMark: string = 'J';

  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Electivire';
  public fullName: string = 'Electivire M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Body Slam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
        }
      });
    }

    // Voltage Hammer
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage = 0;

      return DISCARD_UP_TO_X_ENERGY_FROM_THIS_POKEMON(
        store,
        state,
        effect,
        Number.MAX_SAFE_INTEGER,
        { energyType: EnergyType.BASIC },
        0,
        transfers => {
          effect.damage = transfers.length * 60;
        },
      );
    }

    return state;
  }
}