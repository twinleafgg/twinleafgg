import { EnergyCard } from '../../../game';
import { PlayerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raichu extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Pikachu';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Electromagnetic Induction',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 Lightning Energy cards and attach them to 1 of your Pokémon. Shuffle your deck afterward.'
  },
  {
    name: 'Explosive Thunder',
    cost: [L, C],
    damage: 30,
    damageCalculation: 'x',
    text: 'Discard all basic Lightning Energy cards attached to Raichu. This attack does 30 damage times the number of Lightning Energy cards you discarded.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP21';
  public name: string = 'Raichu';
  public fullName: string = 'Raichu DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Electromagnetic Induction
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DECK,
        [SlotType.ACTIVE, SlotType.BENCH],
        { energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 0, max: 2, allowCancel: true, sameTarget: true },
      );
    }

    // Explosive Thunder
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const lightningEnergy = player.active.cards.filter(c =>
        c instanceof EnergyCard
        && c.energyType === EnergyType.BASIC
        && c.provides.includes(CardType.LIGHTNING)
      );
      effect.damage = 30 * lightningEnergy.length;
      if (lightningEnergy.length > 0) {
        const discardEffect = new DiscardCardsEffect(effect, lightningEnergy);
        discardEffect.target = player.active;
        store.reduceEffect(state, discardEffect);
      }
    }

    return state;
  }
}
