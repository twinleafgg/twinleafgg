import { PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RegigigasFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: F, value: +30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Drain Punch',
    cost: [C, C, C],
    damage: 30,
    text: 'Remove from Regigigas FB a number of damage counters equal to the amount of Energy attached to the Defending Pokémon.'
  }, {
    name: 'Rainbow Lariat',
    cost: [C, C, C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'Does 20 damage times the number of different types of Pokémon SP you have in play.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Regigigas FB';
  public fullName: string = 'Regigigas FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Drain Punch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const checkEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, checkEnergy);
      const energyCount = checkEnergy.energyMap.reduce((sum, em) => sum + em.provides.length, 0);
      if (energyCount > 0) {
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, energyCount * 10);
      }
    }

    // Rainbow Lariat
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const types = new Set<CardType>();
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard()?.hasTag(CardTag.POKEMON_SP)) {
          const checkType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkType);
          checkType.cardTypes.forEach(t => types.add(t));
        }
      });
      effect.damage = 20 * types.size;
    }

    return state;
  }
}
