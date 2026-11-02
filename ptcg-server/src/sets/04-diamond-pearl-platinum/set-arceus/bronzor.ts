import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Bronzor extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +10 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Speed Dive',
    cost: [M],
    damage: 10,
    text: ''
  }, {
    name: 'Extrasensory',
    cost: [C, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If you have the same number of cards in your hand as your opponent, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '34';
  public name: string = 'Bronzor';
  public fullName: string = 'Bronzor AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Extrasensory
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.hand.cards.length === effect.opponent.hand.cards.length) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
