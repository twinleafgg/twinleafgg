import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { Player, PlayerType, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class LucarioGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Boundary Aura',
    powerType: PowerType.POKEBODY,
    text: 'Apply Weakness for each Pokémon (both yours and your opponent\'s) as ×2 instead.'
  }];

  public attacks = [{
    name: 'Combo Throw',
    cost: [M, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each Energy attached to the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Lucario GL';
  public fullName: string = 'Lucario GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Boundary Aura
    if (effect instanceof CheckPokemonStatsEffect) {
      let owner: Player | undefined;
      for (const player of state.players) {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            owner = player;
          }
        });
      }
      if (!owner || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      effect.weakness = effect.weakness.map(w => ({ type: w.type }));
    }

    // Combo Throw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.opponent, effect.opponent.active);
      store.reduceEffect(state, checkProvidedEnergy);
      effect.damage += checkProvidedEnergy.energyMap.length * 10;
    }

    return state;
  }
}
