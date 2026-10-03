import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PokemonCardList, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { FLIP_COIN_TO_PREVENT_DAMAGE_WHEN_DAMAGED_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Accelgor extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shelmet';
  public cardType: CardType[] = [G];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public retreat = [];

  public attacks = [{
    name: 'Raid',
    cost: [C],
    damage: 20,
    damageCalculation: '+',
    text: 'If this Pokémon evolved from Shelmet during this turn, this attack does 40 more damage.'
  },
  {
    name: 'Afterimage Strike',
    cost: [G, C],
    damage: 40,
    text: 'If any damage is done to this Pokémon by attacks during your opponent\'s next turn, flip a coin. If heads, prevent that damage.'
  }];

  public set: string = 'FFI';
  public setNumber: string = '9';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Accelgor';
  public fullName: string = 'Accelgor FFI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raid
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const cardList = StateUtils.findCardList(state, this);

      if (cardList instanceof PokemonCardList) {
        if (cardList.pokemonPlayedTurn === state.turn) {
          effect.damage += 40;
        }
      }
    }
    // Afterimage Strike
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_WHEN_DAMAGED_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
