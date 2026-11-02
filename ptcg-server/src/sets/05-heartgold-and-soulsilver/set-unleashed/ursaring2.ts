import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ursaring2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Teddiursa';
  public hp: number = 110;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Berserk',
    powerType: PowerType.POKEBODY,
    text: 'If Ursaring has any damage counters on it, each of Ursaring\'s attacks does 60 more damage (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Hammer Arm',
    cost: [C, C, C],
    damage: 30,
    text: 'Discard the top card from your opponent\'s deck.'
  },
  {
    name: 'Megaton Lariat',
    cost: [C, C, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';
  public name: string = 'Ursaring';
  public fullName: string = 'Ursaring UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Berserk
    if (effect instanceof AttackEffect && effect.source.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this) && effect.source.damage > 0) {
        effect.damage += 60;
      }
    }

    // Hammer Arm
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      if (opponent.deck.cards.length > 0) {
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
      }
    }

    return state;
  }
}
