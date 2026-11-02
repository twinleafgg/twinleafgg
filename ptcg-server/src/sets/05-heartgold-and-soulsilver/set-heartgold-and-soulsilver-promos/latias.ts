import { EnergyCard } from '../../../game';
import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ATTACH_ENERGY_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Latias extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C }];
  public retreat = [C];

  public attacks = [{
    name: 'Energy Assist',
    cost: [C],
    damage: 10,
    text: 'Search your discard pile for a basic Energy card and attach it to 1 of your Benched Pokémon.'
  }, {
    name: 'Infinite Wind',
    cost: [C, C, C],
    damage: 40,
    text: 'If Latios is on your Bench, remove 2 damage counters from each of your Benched Pokémon.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Latias';
  public fullName: string = 'Latias HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Assist
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);
      const hasEnergy = player.discard.cards.some(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC
      );
      if (!hasBench || !hasEnergy) {
        return state;
      }

      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 1, allowCancel: true }
      );
    }

    // Infinite Wind
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let hasLatios = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (list !== player.active && card.name === 'Latios') {
          hasLatios = true;
        }
      });
      if (!hasLatios) {
        return state;
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList !== player.active) {
          store.reduceEffect(state, new HealEffect(player, cardList, 20));
        }
      });
    }

    return state;
  }
}
