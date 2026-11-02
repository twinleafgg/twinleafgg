import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { DRAW_CARDS, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Probopass extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nosepass';
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Competitiveness',
    powerType: PowerType.POKEBODY,
    text: 'If you don\'t have a Supporter card in play, each of Probopass\'s attacks does 30 more damage to the Active Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Top Chop',
    cost: [M, C],
    damage: 30,
    text: 'Draw a card.'
  }, {
    name: 'Tumbling Attack',
    cost: [M, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 50 damage plus 30 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Probopass';
  public fullName: string = 'Probopass AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Competitiveness
    if (WAS_ATTACK_USED(effect, 0, this) || WAS_ATTACK_USED(effect, 1, this)) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this) && effect.player.supporter.cards.length === 0) {
        effect.damage += 30;
      }
    }

    // Top Chop
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 1);
    }

    // Tumbling Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }

    return state;
  }
}
