import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { FLIP_COIN_TO_PREVENT_DAMAGE_WHEN_DAMAGED_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Frogadier extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Froakie';
  public cardType: CardType[] = [W];
  public hp: number = 80;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Afterimage Strike',
    cost: [C],
    damage: 20,
    text: 'If any damage is done to this Pokémon by attacks during your opponent\'s next turn, flip a coin. If heads, prevent that damage.'
  }];

  public set: string = 'UNB';
  public setNumber: string = '52';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Frogadier';
  public fullName: string = 'Frogadier UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Afterimage Strike
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_WHEN_DAMAGED_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
