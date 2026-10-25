import { PlayerType, PokemonCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { AddSpecialConditionsPowerEffect, CheckPokemonTypeEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Venusaur extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Ivysaur';
  public hp: number = 140;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +40 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Green Aroma',
    powerType: PowerType.POKEBODY,
    text: 'Remove all Special Conditions from each of your Grass Pokémon. Each of your Grass Pokémon can\'t be affected by any Special Conditions.'
  }];

  public attacks = [{
    name: 'Desperate Pollen',
    cost: [G],
    damage: 30,
    text: 'If Venusaur already has 8 or more damage counters on it, the Defending Pokémon is now Burned, Confused, and Poisoned.'
  }, {
    name: 'Special Reaction',
    cost: [G, G, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is affected by any Special Conditions, this attack does 40 damage plus 40 more damage for each of those Special Conditions.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Venusaur';
  public fullName: string = 'Venusaur SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Aroma — clear special conditions
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        let inPlay = false;
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
          if (card === this) {
            inPlay = true;
          }
        });
        if (!inPlay || IS_POKEBODY_BLOCKED(store, state, player, this)) {
          return;
        }
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.specialConditions.length === 0) {
            return;
          }
          const checkType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkType);
          if (checkType.cardTypes.includes(CardType.GRASS)) {
            cardList.clearAllSpecialConditions();
          }
        });
      });
    }

    // Green Aroma — prevent new special conditions on your Grass Pokémon
    if (effect instanceof AddSpecialConditionsEffect || effect instanceof AddSpecialConditionsPowerEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      let inPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          inPlay = true;
        }
      });
      if (!inPlay || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const checkType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.GRASS)) {
        effect.preventDefault = true;
      }
    }

    // Desperate Pollen
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.active.damage >= 80) {
        store.reduceEffect(state, new AddSpecialConditionsEffect(effect, [
          SpecialCondition.BURNED,
          SpecialCondition.CONFUSED,
          SpecialCondition.POISONED,
        ]));
      }
    }

    // Special Reaction
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.damage += effect.opponent.active.specialConditions.length * 40;
    }

    return state;
  }
}
