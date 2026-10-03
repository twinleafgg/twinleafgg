import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { AttachEnergyPrompt, GameMessage, PlayerType, SlotType } from '../../../game';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HandyFan extends TrainerCard {
  public regulationMark = 'H';
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '150';
  public name = 'Handheld Fan';
  public fullName = 'Handheld Fan TWM';

  public text: string =
    "Whenever the Active Pokémon this card is attached to takes damage from an opponent's attack, move an Energy from the attacking Pokémon to 1 of your opponent's Benched Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (state.phase === GamePhase.ATTACK) {
        const player = effect.player;
        const opponent = StateUtils.getOpponent(state, player);
        const hasBench = opponent.bench.some((b) => b.cards.length > 0);

        if (hasBench === false) {
          return state;
        }

        return store.prompt(
          state,
          new AttachEnergyPrompt(
            opponent.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.active,
            PlayerType.TOP_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY },
            { allowCancel: false, min: 0, max: 1 },
          ),
          (transfers) => {
            transfers = transfers || [];
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, opponent, transfer.to);
              MOVE_CARDS(store, state, player.active, target, {
                cards: [transfer.card],
                sourceCard: this,
              });
            }
          },
        );
      }
    }
    return state;
  }
}
