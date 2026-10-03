import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EVOLUTIONARY_ADVANTAGE } from '../../../game/store/prefabs/prefabs';

export class Flabebe extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 30;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Evolutionary Advantage',
    text: 'If you go second, this Pokémon can evolve during your first turn.',
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Tackle',
    cost: [Y],
    damage: 10,
    text: ''
  }];

  public set: string = 'FLI';
  public name: string = 'Flabébé';
  public fullName: string = 'Flabebe FLI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return EVOLUTIONARY_ADVANTAGE(store, state, effect, this);
  }
}
