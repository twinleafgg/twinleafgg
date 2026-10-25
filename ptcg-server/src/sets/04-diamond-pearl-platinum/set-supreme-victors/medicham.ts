import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Medicham extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Meditite';
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Channeling',
    cost: [P, C],
    damage: 60,
    text: 'Your opponent draws 2 cards.'
  }, {
    name: 'Chakra Points',
    cost: [P, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 10 more damage for each card in your opponent\'s hand.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Medicham';
  public fullName: string = 'Medicham SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Channeling
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.opponent, 2);
    }

    // Chakra Points
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage += effect.opponent.hand.cards.length * 10;
    }

    return state;
  }
}
