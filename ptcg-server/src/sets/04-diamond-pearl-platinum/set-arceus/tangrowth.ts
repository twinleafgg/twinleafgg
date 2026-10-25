import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tangrowth extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Tangela';
  public hp: number = 110;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Leaf Guard',
    cost: [G, C],
    damage: 30,
    text: 'During your opponent\'s next turn, any damage done to Tangrowth by attacks is reduced by 20 (after applying Weakness and Resistance).'
  }, {
    name: 'Swallow Up',
    cost: [G, G, C, C],
    damage: 50,
    text: 'Before doing damage, count the remaining HP of the Defending Pokémon and Tangrowth. If the Defending Pokémon has fewer remaining HP than Tangrowth\'s, this attack does 120 damage instead.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Tangrowth';
  public fullName: string = 'Tangrowth AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Leaf Guard
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 20);
    }

    // Swallow Up
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const checkMyHp = new CheckHpEffect(player, player.active);
      store.reduceEffect(state, checkMyHp);
      const myRemainingHp = checkMyHp.hp - player.active.damage;
      const checkOpponentHp = new CheckHpEffect(opponent, opponent.active);
      store.reduceEffect(state, checkOpponentHp);
      const opponentRemainingHp = checkOpponentHp.hp - opponent.active.damage;
      if (opponentRemainingHp < myRemainingHp) {
        effect.damage = 120;
      }
    }

    return state;
  }
}
