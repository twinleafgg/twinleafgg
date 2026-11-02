import { CardType, PokemonCard, PowerType, SpecialCondition, Stage, State, StoreLike } from '../../../game';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { ADD_CONFUSION_TO_PLAYER_ACTIVE, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Weezing extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Koffing';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Camouflage Gas',
    powerType: PowerType.POKEBODY,
    text: 'If Weezing is Confused and is Knocked Out, your opponent can\'t take a Prize card.'
  }];

  public attacks = [{
    name: 'Damage Breakdown',
    cost: [C],
    damage: 0,
    text: 'Count the number of damage counters on Weezing. Put that many damage counters on the Defending Pokémon and Weezing is now Confused.'
  },
  {
    name: 'Smog',
    cost: [P],
    damage: 20,
    text: 'The Defending Pokémon is now Poisoned.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '87';
  public name: string = 'Weezing';
  public fullName: string = 'Weezing RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Camouflage Gas
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this) && effect.target.getPokemonCard() === this) {
      if (IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      if (effect.target.specialConditions.includes(SpecialCondition.CONFUSED)) {
        effect.prizeCount = 0;
      }
    }

    // Damage Breakdown
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const counters = effect.player.active.damage;
      if (counters > 0) {
        const putCounters = new PutCountersEffect(effect, counters);
        putCounters.target = effect.opponent.active;
        store.reduceEffect(state, putCounters);
      }
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.player, this);
    }

    // Smog
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    return state;
  }
}
