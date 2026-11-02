import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonStatsEffect, CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ponyta3 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'Star Barrier',
    powerType: PowerType.POKEBODY,
    text: 'As long as Ponyta has any Energy attached to it, Ponyta has no Weakness.'
  }];

  public attacks = [{
    name: 'Blue Fire',
    cost: [R, R],
    damage: 50,
    text: 'Discard all Fire Energy attached to Ponyta.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH11';
  public name: string = 'Ponyta';
  public fullName: string = 'Ponyta AR3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Star Barrier
    if (effect instanceof CheckPokemonStatsEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (!IS_POKEBODY_BLOCKED(store, state, player, this)) {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, effect.target);
        store.reduceEffect(state, checkProvidedEnergy);
        if (checkProvidedEnergy.energyMap.length > 0) {
          effect.weakness = [];
        }
      }
    }

    // Blue Fire
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const cards = [...new Set(
        checkProvidedEnergy.energyMap
          .filter(em => em.provides.includes(R) || em.provides.includes(CardType.ANY))
          .map(em => em.card)
      )];
      if (cards.length > 0) {
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
      }
    }

    return state;
  }
}
