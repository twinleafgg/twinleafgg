import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GET_TOTAL_ENERGY_ATTACHED_TO_PLAYERS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Pincurchin extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Energy Crush',
    cost: [C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each Energy attached to all of your opponent\'s Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Pincurchin';
  public fullName: string = 'Pincurchin M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const totalEnergy = GET_TOTAL_ENERGY_ATTACHED_TO_PLAYERS_POKEMON(opponent, store, state);
      effect.damage = 20 * totalEnergy;
    }

    return state;
  }
}
