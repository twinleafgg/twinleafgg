import { Attack, CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_RETALIATES_ON_DAMAGE_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Magby extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 30;
  public weakness = [{ type: W }];
  public retreat = [];

  public attacks: Attack[] = [{
    name: 'Scorching Heater',
    cost: [],
    damage: 0,
    text: 'During your opponent\'s next turn, if this Pokémon is damaged by an attack ' +
      '(even if it is Knocked Out), put 6 damage counters on the Attacking Pokémon.'
  }];

  public set: string = 'PAR';
  public regulationMark: string = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Magby';
  public fullName: string = 'Magby PAR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_RETALIATES_ON_DAMAGE_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this, { damage: 60 });
    }

    return state;
  }
}