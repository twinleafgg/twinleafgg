import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameError, GameMessage, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON } from '../../../game/store/prefabs/prefabs';

export class MirageGate extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'LOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '163';
  public regulationMark = 'F';
  public name: string = 'Mirage Gate';
  public fullName: string = 'Mirage Gate LOR';

  public text: string = `You can use this card only if you have 7 or more cards in the Lost Zone. 

Search your deck for up to 2 basic Energy cards of different types and attach them to your Pokémon in any way you like. Then, shuffle your deck.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (player.lostzone.cards.length <= 6) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      /*
       * Legacy pre-prefab implementation:
       * - custom generator + AttachEnergyPrompt from deck
       * - manual "two different energy types" check by comparing selected card names
       * - manual attachment with StateUtils.getTarget
       * - manual deck shuffle prompt
       */
      // Converted to prefab version (ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON).
      ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON(store, state, player, 2, 2, {
        destinationSlots: [SlotType.BENCH, SlotType.ACTIVE],
        energyFilter: { energyType: EnergyType.BASIC },
        differentTypes: true,
        allowCancel: false,
        min: 0,
      });
    }

    return state;
  }
}
