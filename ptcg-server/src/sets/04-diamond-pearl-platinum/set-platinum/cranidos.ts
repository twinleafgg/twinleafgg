import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, DISCARD_A_STADIUM_CARD_IN_PLAY, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cranidos extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Skull Fossil';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Rock Smash',
    cost: [F],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 20 more damage.'
  }, {
    name: 'Knock Over',
    cost: [F, C],
    damage: 40,
    text: 'You may discard any Stadium card in play.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Cranidos';
  public fullName: string = 'Cranidos PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rock Smash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    // Knock Over
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (StateUtils.getStadiumCard(state) !== undefined) {
        CONFIRMATION_PROMPT(store, state, effect.player, wantToDiscard => {
          if (wantToDiscard) {
            DISCARD_A_STADIUM_CARD_IN_PLAY(state);
          }
        });
      }
    }

    return state;
  }
}
