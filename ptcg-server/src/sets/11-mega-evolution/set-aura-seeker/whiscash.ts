import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_A_STADIUM_CARD_IN_PLAY, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Whiscash extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Barboach';
  public hp: number = 130;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Great Tremor',
    cost: [F, C],
    damage: 180,
    text: 'Discard a Stadium in play or this attack does nothing.'
  },
  {
    name: 'Mud Shot',
    cost: [F, C, C],
    damage: 100,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Whiscash';
  public fullName: string = 'Whiscash FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Great Tremor
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard === undefined) {
        effect.damage = 0;
        return state;
      }
      DISCARD_A_STADIUM_CARD_IN_PLAY(state);
    }

    return state;
  }
}
