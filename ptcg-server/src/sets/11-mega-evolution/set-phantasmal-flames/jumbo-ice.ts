import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { Player } from '../../../game/store/state/player';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class JumboIce extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'I';
  public set: string = 'PFL';
  public name: string = 'Jumbo Ice Cream';
  public fullName: string = 'Jumbo Ice M2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public text: string =
    'Heal 80 damage from your Active Pokémon that has 3 or more Energy attached.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const activePokemon = player.active.getPokemonCard();

    // Must have an active Pokemon
    if (!activePokemon) {
      return false;
    }

    // Must have damage on it
    if (player.active.damage === 0) {
      return false;
    }

    // Must have 3 or more Energy attached
    const energyCount = player.active.energies.cards.length;
    if (energyCount < 3) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const activePokemon = player.active.getPokemonCard();

      if (activePokemon && player.active.damage > 0) {
        // Check if the Pokemon has 3 or more Energy attached
        const checkEnergy = new CheckProvidedEnergyEffect(player);
        store.reduceEffect(state, checkEnergy);

        if (checkEnergy.energyMap.length >= 3) {
          const healEffect = new HealEffect(player, player.active, 80);
          store.reduceEffect(state, healEffect);
        }
      }
      MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });
    }

    return state;
  }
}
