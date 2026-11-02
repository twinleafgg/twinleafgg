import { PokemonCard, CardType, Stage, EnergyCard, PowerType, State, StoreLike } from '../../game';
import { CheckRetreatCostEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { BLOCK_RETREAT } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Flygon extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Vibrava';
  public hp: number = 120;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    // Levitate
    name: 'Levitate',
    powerType: PowerType.POKEBODY,
    text: 'As long as Flygon has any Energy attached to it, the Retreat Cost for Flygon is 0.'
  }];

  public attacks = [{
    // Bite
    name: 'Bite',
    cost: [F, C],
    damage: 30,
    text: ''
  }, {
    // Sand Pit
    name: 'Sand Pit',
    cost: [F, C, C, C],
    damage: 70,
    text: 'The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Flygon';
  public fullName: string = 'Flygon P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Levitate
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      if (player.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (player.active.cards.some(c => c instanceof EnergyCard)) {
        effect.cost = [];
      }
    }
    // Sand Pit
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    return state;
  }
}
