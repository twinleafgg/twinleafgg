import { GameError, MoveEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class UltimateZone extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public name = 'Ultimate Zone';
  public fullName = 'Ultimate Zone AR';

  public text =
    "During each player's turn, the player may move an Energy card attached to 1 of his or her Benched Pokémon to his or her Active Arceus as often as he or she likes.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      if (player.active.getPokemonCard()?.name !== 'Arceus') {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: true },
        ),
        (transfers) => {
          if (transfers && transfers.length > 0) {
            for (const transfer of transfers) {
              const source = StateUtils.getTarget(state, player, transfer.from);
              const target = StateUtils.getTarget(state, player, transfer.to);

              if (target !== player.active) {
                throw new GameError(GameMessage.MOVE_ENERGY_TO_ACTIVE);
              }

              if (source && target) {
                MOVE_CARDS(store, state, source, target, {
                  cards: [transfer.card],
                  sourceCard: this,
                });
              }
            }
          }
        },
      );
    }
    return state;
  }
}
