import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError, GameMessage, SlotType, Player, pokemonHasCardType } from '../../../game';
import { LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY } from '../../../game/store/prefabs/prefabs';

export class ElectricGenerator extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'G';

  public set: string = 'SVI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '170';

  public name: string = 'Electric Generator';

  public fullName: string = 'Electric Generator SVI';

  public text: string =
    'Look at the top 5 cards of your deck and attach up to 2 [L] Energy cards you find there to your Benched [L] Pokémon in any way you like. Shuffle the other cards back into your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }

    let lightningPokemonOnBench = false;

    player.bench.forEach((benchSpot) => {
      const card = benchSpot.getPokemonCard();
      if (card && pokemonHasCardType(card, CardType.LIGHTNING)) {
        lightningPokemonOnBench = true;
      }
    });

    if (!lightningPokemonOnBench) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let lightningPokemonOnBench = false;

      player.bench.forEach((benchSpot) => {
        const card = benchSpot.getPokemonCard();
        if (card && pokemonHasCardType(card, CardType.LIGHTNING)) {
          lightningPokemonOnBench = true;
        }
      });

      if (!lightningPokemonOnBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      /*
       * Legacy pre-prefab implementation:
       * - moved top 5 cards into a temporary CardList
       * - manually filtered Lightning Energy in that temporary list
       * - ran AttachEnergyPrompt with blocked non-Lightning bench targets
       * - manually returned remaining cards to deck and shuffled
       */
      // Converted to prefab version (LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY).
      LOOK_AT_TOP_X_CARDS_AND_ATTACH_UP_TO_Y_ENERGY(store, state, player, 5, 2, {
        destinationSlots: [SlotType.BENCH],
        targetFilter: (_target, pokemonCard) => pokemonHasCardType(pokemonCard, CardType.LIGHTNING),
        energyFilter: { energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        remainderDestination: 'shuffle',
      });
    }

    return state;
  }
}
