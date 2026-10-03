import { PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ADAPTIVE_EVOLUTION } from '../../../game/store/prefabs/prefabs';

export class Metapod extends PokemonCard {

  public regulationMark = 'D';

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Caterpie';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 80;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Adaptive Evolution',
    text: 'This Pokémon can evolve during your first turn or the turn you play it.',
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Ram',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 20,
    text: ''
  }];

  public set: string = 'RCL';

  public name: string = 'Metapod';

  public fullName: string = 'Metapod RCL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ADAPTIVE_EVOLUTION(store, state, effect, this);
  }
}
