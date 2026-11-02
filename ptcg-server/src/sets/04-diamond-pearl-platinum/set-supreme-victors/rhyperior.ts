import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Rhyperior extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Rhydon';
  public hp: number = 140;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Raging Drill',
    cost: [F, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each damage counter on Rhyperior.'
  }, {
    name: 'Deep Scrap',
    cost: [F, F, C, C],
    damage: 60,
    text: 'If the Defending Pokémon would be Knocked Out by this attack, discard the top 3 cards from your opponent\'s deck.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Rhyperior';
  public fullName: string = 'Rhyperior SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raging Drill
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage += effect.player.active.damage;
    }

    // Deep Scrap
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      const checkHpEffect = new CheckHpEffect(opponent, opponent.active);
      store.reduceEffect(state, checkHpEffect);
      if (opponent.active.damage + effect.damage >= checkHpEffect.hp) {
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 3, sourceCard: this, sourceEffect: this.attacks[1] });
      }
    }

    return state;
  }
}
