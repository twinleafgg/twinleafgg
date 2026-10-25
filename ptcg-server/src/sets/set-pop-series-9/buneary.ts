import { PokemonCard, Stage, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../game/store/prefabs/prefabs';

export class Buneary extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: 10 }];
  public retreat = [C];

  public attacks = [{
    // Dizzy Punch
    name: 'Dizzy Punch',
    cost: [C],
    damage: 10,
    text: 'Flip 2 coins. This attack does 10 damage times the number of heads.'
  }, {
    // Defense Curl
    name: 'Defense Curl',
    cost: [C, C],
    damage: 0,
    text: 'Flip a coin. If heads, prevent all damage done to Buneary by attacks during your opponent\'s next turn.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Buneary';
  public fullName: string = 'Buneary OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 10 * heads;
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }
    return state;
  }
}
