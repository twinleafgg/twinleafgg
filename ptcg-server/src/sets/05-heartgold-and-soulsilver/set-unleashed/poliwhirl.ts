import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Poliwhirl extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Poliwag';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Hypnoblast',
    cost: [W],
    damage: 20,
    text: 'The Defending Pokémon is now Asleep.'
  },
  {
    name: 'Light Punch',
    cost: [C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '37';
  public name: string = 'Poliwhirl';
  public fullName: string = 'Poliwhirl UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hypnoblast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
    }

    return state;
  }
}
