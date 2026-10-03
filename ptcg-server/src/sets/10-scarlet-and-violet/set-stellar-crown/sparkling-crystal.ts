import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckAttackCostEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class SparklingCrystal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  protected _tags = [CardTag.ACE_SPEC];

  public set: string = 'SCR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '142';

  public regulationMark = 'H';

  public name: string = 'Sparkling Crystal';

  public fullName: string = 'Sparkling Crystal SCR';

  public text: string =
    'When the Tera Pokémon this card is attached to uses an attack, that attack costs 1 Energy less. (The Energy can be of any type.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.player.active.tools.includes(this)) {
      const pokemonCard = effect.player.active.getPokemonCard();

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_TERA)) {
        const checkEnergy = new CheckProvidedEnergyEffect(effect.player);
        store.reduceEffect(state, checkEnergy);

        const availableEnergy = [...checkEnergy.energyMap.flatMap((e) => e.provides)];

        if (effect.cost.length > 0) {
          // A list of matched energies (one entry per printed cost slot we can cover).
          const contained: CardType[] = [];
          for (const costType of effect.cost) {
            if (costType === CardType.COLORLESS && availableEnergy.length > 0) {
              contained.push(availableEnergy.splice(0, 1)[0]);
              continue;
            }
            let i = availableEnergy.indexOf(costType);
            if (i > -1) {
              contained.push(availableEnergy.splice(i, 1)[0]);
              continue;
            }
            // Rainbow / Double Dragon / similar: provides CardType.ANY units that must pay typed costs too.
            i = availableEnergy.indexOf(CardType.ANY);
            if (i > -1) {
              contained.push(availableEnergy.splice(i, 1)[0]);
            }
          }
          //If the contained pool is met or one less than the cost, then it's good.
          if (contained.length >= effect.cost.length - 1) {
            effect.cost = contained;
          }
        }
      }
    }
    return state;
  }
}
