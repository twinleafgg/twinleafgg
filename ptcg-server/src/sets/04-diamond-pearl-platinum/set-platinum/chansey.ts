import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';
import { COIN_FLIP_PROMPT, HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Chansey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Healing Trial',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, remove 3 damage counters from Chansey. If tails, remove 3 damage counters from the Defending Pokémon.'
  }, {
    name: 'Pulled Punch',
    cost: [C, C],
    damage: 40,
    text: 'If the Defending Pokémon already has any damage counters on it, this attack\'s base damage is 10 instead of 40.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';
  public name: string = 'Chansey';
  public fullName: string = 'Chansey PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Healing Trial
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 30);
        } else {
          const healEffect = new HealTargetEffect(effect, 30);
          healEffect.target = effect.opponent.active;
          store.reduceEffect(state, healEffect);
        }
      });
    }

    // Pulled Punch
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.damage > 0) {
        effect.damage = 10;
      }
    }

    return state;
  }
}
