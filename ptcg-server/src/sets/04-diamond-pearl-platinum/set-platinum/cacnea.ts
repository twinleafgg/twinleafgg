import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cacnea extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Sneaky Attack',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'If Cacnea has any Darkness Energy attached to it, this attack does 10 damage plus 10 more damage.'
  }, {
    name: 'Shoot Needle',
    cost: [G],
    damage: 0,
    text: 'Flip 2 coins. For each heads, choose 1 of your opponent\'s Pokémon and this attack does 10 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) (You can choose the same Pokémon more than once, but you can\'t do more than 10 damage to that Pokémon in this way.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Cacnea';
  public fullName: string = 'Cacnea PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sneaky Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkEnergy);
      const hasDarkness = checkEnergy.energyMap.some(em =>
        em.provides.includes(CardType.DARK) || em.provides.includes(CardType.ANY)
      );
      if (hasDarkness) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 10);
      }
    }

    // Shoot Needle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads === 0) {
          return;
        }
        const inPlay = opponent.getPokemonInPlay().length;
        const max = Math.min(heads, inPlay);
        store.prompt(state, new ChoosePokemonPrompt(
          effect.player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max, allowCancel: false }
        ), selected => {
          (selected || []).forEach(target => {
            if (target === opponent.active) {
              const damageEffect = new DealDamageEffect(effect, 10);
              damageEffect.target = target;
              store.reduceEffect(state, damageEffect);
            } else {
              const damageEffect = new PutDamageEffect(effect, 10);
              damageEffect.target = target;
              store.reduceEffect(state, damageEffect);
            }
          });
        });
      });
    }

    return state;
  }
}
