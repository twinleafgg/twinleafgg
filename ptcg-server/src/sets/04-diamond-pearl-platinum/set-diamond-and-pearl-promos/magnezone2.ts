import { ChooseEnergyPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT } from '../../../game/store/prefabs/prefabs';
import { CONFIRMATION_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Magnezone2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Magneton';
  public hp: number = 130;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Charge Beam',
    cost: [L],
    damage: 30,
    text: 'Search your discard pile for an Energy card and attach it to Magnezone.'
  },
  {
    name: 'Metallic Bolt',
    cost: [L, M, C, C],
    damage: 60,
    text: 'You may discard a Lightning Energy and a Metal Energy attached to Magnezone. If you do, this attack\'s base damage is 120 instead of 60.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP44';
  public name: string = 'Magnezone';
  public fullName: string = 'Magnezone DPP2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Charge Beam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!player.discard.cards.some(card => card.superType === SuperType.ENERGY)) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 0, max: 1, sameTarget: true },
      );
    }

    // Metallic Bolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const hasLightning = checkProvidedEnergy.energyMap.some(em => em.provides.includes(CardType.LIGHTNING));
      const hasMetal = checkProvidedEnergy.energyMap.some(em => em.provides.includes(CardType.METAL));
      if (!hasLightning || !hasMetal) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantToDiscard => {
        if (!wantToDiscard) {
          return;
        }
        store.prompt(state, new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkProvidedEnergy.energyMap,
          [CardType.LIGHTNING, CardType.METAL],
          { allowCancel: false }
        ), energy => {
          const cards = (energy || []).map(e => e.card);
          if (cards.length > 0) {
            const discardEnergy = new DiscardCardsEffect(effect, cards);
            discardEnergy.target = player.active;
            store.reduceEffect(state, discardEnergy);
            effect.damage = 120;
          }
        });
      }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
    }

    return state;
  }
}
