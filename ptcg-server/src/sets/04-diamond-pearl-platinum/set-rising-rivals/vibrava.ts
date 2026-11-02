import { CardType, PokemonCard, Stage, State, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Vibrava extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Trapinch';
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Energy Typhoon',
    cost: [C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the number of Energy cards in your opponent\'s discard pile. Then, put those Energy cards on top of your opponent\'s deck. Your opponent shuffles his or her deck afterward.'
  },
  {
    name: 'Quick Attack',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 20 more damage.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Vibrava';
  public fullName: string = 'Vibrava RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Typhoon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const energyCards = opponent.discard.cards.filter(c => c.superType === SuperType.ENERGY);
      effect.damage = 20 * energyCards.length;
      if (energyCards.length > 0) {
        MOVE_CARDS(store, state, opponent.discard, opponent.deck, { cards: energyCards, sourceCard: this });
        SHUFFLE_DECK(store, state, opponent);
      }
    }

    // Quick Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}
