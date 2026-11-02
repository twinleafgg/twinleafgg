import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, DISCARD_A_STADIUM_CARD_IN_PLAY, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Glalie extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Snorunt';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Wreck',
    cost: [C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'If there is any Stadium card in play, this attack does 20 damage plus 50 more damage. Discard that Stadium card.'
  }, {
    name: 'Avalanche',
    cost: [W, W, C],
    damage: 50,
    text: 'Flip a coin. If heads, this attack does 10 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Glalie';
  public fullName: string = 'Glalie AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wreck
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (StateUtils.getStadiumCard(state) !== undefined) {
        effect.damage += 50;
        DISCARD_A_STADIUM_CARD_IN_PLAY(state);
      }
    }

    // Avalanche
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          const opponent = StateUtils.getOpponent(state, effect.player);
          opponent.bench.forEach(target => {
            if (target.cards.length > 0) {
              const damageEffect = new PutDamageEffect(effect, 10);
              damageEffect.target = target;
              store.reduceEffect(state, damageEffect);
            }
          });
        }
      });
    }

    return state;
  }
}
