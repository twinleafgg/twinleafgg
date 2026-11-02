import { PokemonCard, CardType, Stage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Donphan extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Phanpy';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    // Sniff Out
    name: 'Sniff Out',
    cost: [C],
    damage: 0,
    text: 'Put any 1 card from your discard pile into your hand.'
  }, {
    // Fury Attack
    name: 'Fury Attack',
    cost: [F, C, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 30 damage times the number of heads.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Donphan';
  public fullName: string = 'Donphan P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sniff Out
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        {},
        { min: 1, max: 1, allowCancel: false }
      );
    }
    // Fury Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 3, results => {
        effect.damage = 30 * results.filter(r => r).length;
      });
    }
    return state;
  }
}
