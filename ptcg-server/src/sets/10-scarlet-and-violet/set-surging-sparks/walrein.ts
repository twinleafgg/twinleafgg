
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { OPPONENT_POKEMON_WITH_X_OR_LESS_ENERGY_CANNOT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Walrein extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Sealeo';
  public cardType: CardType[] = [W];
  public hp: number = 170;
  public weakness = [{ type: M }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Frigid Fangs',
    cost: [W],
    damage: 60,
    text: 'During your opponent\'s next turn, Pokémon that have 2 or less Energy attached can\'t attack. (This includes new Pokémon that come into play.)'
  },
  {
    name: 'Megaton Fall',
    cost: [W, W],
    damage: 170,
    text: 'This Pokémon also does 50 damage to itself.'
  }];

  public set: string = 'SSP';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Walrein';
  public fullName: string = 'Walrein SSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Frigid Fangs
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENT_POKEMON_WITH_X_OR_LESS_ENERGY_CANNOT_ATTACK(store, state, effect, this, 2);
    }
    // Megaton Fall
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 50);
    }
    return state;
  }
}