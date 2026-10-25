import { PokemonCard, Stage, CardType, StoreLike, State, StateUtils, PokemonCardList } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../game/store/prefabs/prefabs';

export class Raichu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Pikachu';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Slam
    name: 'Slam',
    cost: [C, C],
    damage: 30,
    text: 'Flip 2 coins. This attack does 30 damage times the number of heads.'
  }, {
    // High Voltage
    name: 'High Voltage',
    cost: [L, L, L],
    damage: 60,
    text: 'If Raichu evolved from Pikachu this turn, this attack\'s base damage is 100 instead of 60.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Raichu';
  public fullName: string = 'Raichu OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 30 * heads;
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList)) {
        return state;
      }
      if (cardList.pokemonPlayedTurn === state.turn) {
        effect.damage += 40;
      }
    }
    return state;
  }
}
