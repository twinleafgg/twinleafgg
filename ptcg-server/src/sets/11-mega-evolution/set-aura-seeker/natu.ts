import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Natu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Scary Face',
    cost: [P],
    damage: 0,
    text: 'During your opponent\'s next turn, attacks used by the Defending Pokémon do 30 less damage.'
  },
  {
    name: 'Flap',
    cost: [P],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '26';
  public name: string = 'Natu';
  public fullName: string = 'Natu FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Scary Face
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, 30);
    }

    return state;
  }
}
