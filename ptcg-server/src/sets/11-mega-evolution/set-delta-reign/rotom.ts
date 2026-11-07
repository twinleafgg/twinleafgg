import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_PARALYZED_TO_PLAYER_ACTIVE, AFTER_ATTACK, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';

export class Rotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Thunder Shock',
    cost: [L, C],
    damage: 50,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '34';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Rotom';
  public fullName: string = 'Rotom MEE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thunder Shock
    if (AFTER_ATTACK(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, StateUtils.getOpponent(state, effect.player), this);
        }
      });
    }

    return state;
  }
}
