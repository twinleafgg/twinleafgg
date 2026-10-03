import { PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { EVOLUTIONARY_ADVANTAGE } from '../../../game/store/prefabs/prefabs';

export class Shinx extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 50;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Evolutionary Advantage',
    powerType: PowerType.ABILITY,
    text: 'If you go second, this Pokémon can evolve during your first turn.',
  }];

  public attacks = [{ name: 'Static Shock', cost: [L], damage: 10, text: '' }];

  public set: string = 'UPR';
  public name: string = 'Shinx';
  public fullName: string = 'Shinx UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return EVOLUTIONARY_ADVANTAGE(store, state, effect, this);
  }
}
