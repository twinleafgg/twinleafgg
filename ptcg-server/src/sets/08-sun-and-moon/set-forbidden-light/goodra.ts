import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Goodra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public cardType: CardType[] = [N];
  public hp: number = 160;
  public weakness = [{ type: Y }];
  public retreat = [C, C, C];
  public evolvesFrom = 'Sliggoo';

  public powers = [{
    name: 'Hydration',
    powerType: PowerType.ABILITY,
    text: 'Whenever you attach a [W] Energy card from your hand to this Pokémon, heal 20 damage from it.'
  }];

  public attacks = [{
    name: 'Soaking Horn',
    cost: [W, Y, C],
    damage: 80,
    damageCalculation: '+',
    text: 'If this Pokémon was healed during this turn, this attack does 80 more damage.'
  }];

  public set: string = 'FLI';
  public name: string = 'Goodra';
  public fullName: string = 'Goodra FLI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Hydration
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (IS_ABILITY_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.energyCard.energyType === EnergyType.BASIC && effect.energyCard.provides.includes(CardType.WATER)) {
        const healEffect = new HealEffect(effect.player, effect.target, 20);
        return store.reduceEffect(state, healEffect);
      }

      // Check special energies that provide [W]
      if (effect.energyCard.energyType === EnergyType.SPECIAL) {
        // Temporarily push the energy card to the list of cards to check if it provides [W]
        effect.target.cards.push(effect.energyCard);
        const checkWaterEnergy = new CheckProvidedEnergyEffect(effect.player, effect.target);
        store.reduceEffect(state, checkWaterEnergy);
        effect.target.cards.pop();

        const energyMap = checkWaterEnergy.energyMap.find(element => element.card === effect.energyCard);
        const providedEnergy = energyMap?.provides;
        if (providedEnergy?.includes(CardType.WATER)
          || providedEnergy?.includes(CardType.ANY)) {
          const healEffect = new HealEffect(effect.player, effect.target, 20);
          return store.reduceEffect(state, healEffect);
        }
      }
    }

    // Soaking Horn
    // Ref: set-fates-collide/altaria-ex.ts (Powerful Gain — healedThisTurn)
    if (WAS_ATTACK_USED(effect, 0, this) && effect.player.active.healedThisTurn) {
      effect.damage += 80;
    }

    return state;
  }
}