import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Kangaskhanex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public regulationMark = 'G';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 230;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Triple Draw',
    cost: [C],
    damage: 0,
    text: 'Draw 3 cards.'
  }, {
    name: 'Incessant Punching',
    cost: [C, C, C],
    damage: 100,
    damageCalculator: 'x',
    text: 'Flip 4 coins. This attack does 100 damage for each heads.'
  }];

  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '115';
  public name: string = 'Kangaskhan ex';
  public fullName: string = 'Kangaskhan ex MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 4, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 100 * heads;
      });
    }

    return state;
  }
}
