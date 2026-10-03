import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { Player } from '../../../game';
import { SWITCH_IN_OPPONENT_BENCHED_POKEMON } from '../../../game/store/prefabs/prefabs';

export class CounterCatcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'PAR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '160';
  public regulationMark = 'G';
  public name: string = 'Counter Catcher';
  public fullName: string = 'Counter Catcher PAR';

  public text: string = `You can play this card only if you have more Prize Cards remaining than your opponent.

Switch in 1 of your opponent's Benched Pokémon to the Active Spot.`;

  public readonly COUNTER_CATCHER_MARKER = 'COUNTER_CATCHER_MARKER';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const opponent = StateUtils.getOpponent(state, player);
    const hasBench = opponent.bench.some((b) => b.cards.length > 0);

    if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    if (!hasBench) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Legacy implementation:
      // - Used a ChoosePokemonPrompt targeting opponent Bench.
      // - Switched opponent Active to selected Bench target.
      //
      // Converted to prefab version (SWITCH_IN_OPPONENT_BENCHED_POKEMON).
      SWITCH_IN_OPPONENT_BENCHED_POKEMON(store, state, player, { allowCancel: false });
    }

    return state;
  }
}
