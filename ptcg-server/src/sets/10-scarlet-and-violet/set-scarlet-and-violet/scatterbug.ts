import { PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ADAPTIVE_EVOLUTION } from '../../../game/store/prefabs/prefabs';

export class Scatterbug extends PokemonCard {

  public regulationMark = 'G';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [G];

  public hp: number = 30;

  public weakness = [{ type: R }];

  public retreat = [C];

  public powers = [{
    name: 'Adaptive Evolution',
    text: 'This Pokémon can evolve during your first turn or the turn you play it.',
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Tackle',
    cost: [G, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SVI';

  public name: string = 'Scatterbug';

  public fullName: string = 'Scatterbug SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ADAPTIVE_EVOLUTION(store, state, effect, this);
  }
}
