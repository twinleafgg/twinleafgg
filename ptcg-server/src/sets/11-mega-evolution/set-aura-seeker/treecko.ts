import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Treecko extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Hide',
    cost: [G],
    damage: 0,
    text: 'Flip a coin. If heads, during your opponent\'s next turn, prevent all damage from and effects of attacks done to this Pokémon.'
  },
  {
    name: 'Cut',
    cost: [G],
    damage: 10,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Treecko';
  public fullName: string = 'Treecko FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hide
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_AND_EFFECTS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
