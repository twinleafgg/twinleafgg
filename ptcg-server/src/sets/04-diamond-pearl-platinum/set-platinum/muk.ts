import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { ADD_POISON_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Muk extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Grimer';
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Sludge Cell',
    powerType: PowerType.POKEBODY,
    text: 'If Muk remains affected by any Special Conditions between turns, remove 2 damage counters from Muk.'
  }];

  public attacks = [{
    name: 'Strange Poison',
    cost: [P, C],
    damage: 30,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Poisoned. If tails, Muk is now Poisoned.'
  }, {
    name: 'Strange Sludge',
    cost: [P, P, C],
    damage: 50,
    damageCalculation: '+',
    text: 'If Muk is Poisoned, this attack does 50 damage plus 20 more damage and the Defending Pokémon is now Confused.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';
  public name: string = 'Muk';
  public fullName: string = 'Muk PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sludge Cell
    if (effect instanceof BetweenTurnsEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() !== this) {
          return;
        }
        if (cardList.specialConditions.length === 0 || cardList.damage === 0) {
          return;
        }
        if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
          return;
        }
        store.reduceEffect(state, new HealEffect(player, cardList, 20));
      });
    }

    // Strange Poison
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
        } else {
          ADD_POISON_TO_PLAYER_ACTIVE(store, state, effect.player, this);
        }
      });
    }

    // Strange Sludge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.active.specialConditions.includes(SpecialCondition.POISONED)) {
        effect.damage += 20;
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    return state;
  }
}
