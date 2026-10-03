import { SuperType, EnergyType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, EnergyCard, GameError, GameMessage, Player, PlayerType, SlotType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

import {COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EnergySticker extends TrainerCard {
  public superType = SuperType.TRAINER;

  public regulationMark = 'G';

  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '159';
  public name: string = 'Energy Sticker';
  public fullName: string = 'Energy Sticker MEW';

  public text = 'Flip a coin. If heads, attach a Basic Energy card from your discard pile to 1 of your Benched Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const openSlots = player.bench.filter(b => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    const hasBasicEnergy = player.discard.cards.some(c =>
      c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC
    );
    if (!hasBasicEnergy) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof TrainerEffect && effect.trainerCard === this) {

      const player = effect.player;

      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC;
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {

          return state;
        }
        if (result === true) {

          const player = effect.player;

          state = store.prompt(state, new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.discard,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { allowCancel: false, min: 1, max: 1 }
          ), transfers => {
            transfers = transfers || [];
            // cancelled by user
            if (transfers.length === 0) {

              return;
            }
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });

            }
          });

          return state;
        }
        return state;
      });
    }
    return state;
  }

}
