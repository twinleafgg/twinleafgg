import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ZapdosG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Charge Beam',
    cost: [C],
    damage: 10,
    text: 'Flip a coin. If heads, search your discard pile for an Energy card and attach it to Zapdos G.'
  }, {
    name: 'Lightning Strike',
    cost: [L, L, C],
    damage: 40,
    text: 'You may discard all Lightning attached to Zapdos G. If you do, this attack\'s base damage is 80 instead of 40.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Zapdos G';
  public fullName: string = 'Zapdos G AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Charge Beam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        const hasEnergy = player.discard.cards.some(c => c.superType === SuperType.ENERGY);
        if (!hasEnergy) {
          return;
        }
        ATTACH_ENERGY_PROMPT(
          store,
          state,
          player,
          PlayerType.BOTTOM_PLAYER,
          SlotType.DISCARD,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false }
        );
      });
    }

    // Lightning Strike
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const cards = [...new Set(
        checkProvidedEnergy.energyMap
          .filter(em => em.provides.includes(L) || em.provides.includes(CardType.ANY))
          .map(em => em.card)
      )];
      if (cards.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
          effect.damage = 80;
        }
      });
    }

    return state;
  }
}
