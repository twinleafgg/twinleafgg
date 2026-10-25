import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { CheckSpecialConditionRemovalEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { SHUFFLE_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_DECK } from '../../../game/store/prefabs/attack-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Gliscor extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Gligar';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: 20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Bind Eye',
    powerType: PowerType.POKEBODY,
    text: 'As long as Gliscor is your Active Pokémon, your opponent can\'t remove any Special Conditions by evolving or devolving his or her Pokémon. (This also includes putting a Pokémon Level-Up card onto that Pokémon.)'
  }];

  public attacks = [{
    name: 'Cutting Turn',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, put damage counters on the Defending Pokémon until it is 10HP away from being Knocked Out. If you do, shuffle Gliscor and all cards attached to it back into your deck.'
  },
  {
    name: 'Friction Heat',
    cost: [F],
    damage: 20,
    text: 'The Defending Pokémon is now Burned.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP36';
  public name: string = 'Gliscor';
  public fullName: string = 'Gliscor DPP';

  public usedCuttingTurn = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bind Eye
    if (effect instanceof CheckSpecialConditionRemovalEffect) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner.active.getPokemonCard() !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, owner);
      const isOpponentPokemon =
        opponent.active === effect.target ||
        opponent.bench.includes(effect.target);
      if (isOpponentPokemon) {
        effect.target.specialConditions.forEach(condition => {
          if (!effect.preservedConditions.includes(condition)) {
            effect.preservedConditions.push(condition);
          }
        });
      }
    }

    // Cutting Turn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedCuttingTurn = false;
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          return;
        }
        const opponent = StateUtils.getOpponent(state, effect.player);
        const selectedTarget = opponent.active;
        const checkHpEffect = new CheckHpEffect(effect.player, selectedTarget);
        store.reduceEffect(state, checkHpEffect);
        let damageAmount = checkHpEffect.hp - 10;
        if (selectedTarget.damage > 0) {
          damageAmount = Math.max(0, damageAmount - selectedTarget.damage);
        }
        if (damageAmount > 0) {
          const damageEffect = new PutDamageEffect(effect, damageAmount);
          damageEffect.target = selectedTarget;
          store.reduceEffect(state, damageEffect);
          this.usedCuttingTurn = true;
        }
      });
    }

    if (AFTER_ATTACK(effect, 0, this) && this.usedCuttingTurn) {
      this.usedCuttingTurn = false;
      SHUFFLE_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_DECK(store, state, effect);
    }

    // Friction Heat
    if (WAS_ATTACK_USED(effect, 1, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    return state;
  }
}
