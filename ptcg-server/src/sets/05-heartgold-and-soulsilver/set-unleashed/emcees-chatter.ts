import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, Player, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class EmceesChatter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UL';
  public name: string = 'Emcee\'s Chatter';
  public fullName: string = 'Emcee\'s Chatter UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public text: string = 'Flip a coin. If heads, draw 3 cards. If tails, draw 2 cards.';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.supporterTurn === 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      COIN_FLIP_PROMPT(store, state, player, result => {
        DRAW_CARDS(store, state, player, result ? 3 : 2);
      });
    }

    return state;
  }
}
