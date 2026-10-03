import { GameError, StateUtils } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class TeamRocketsHandiwork extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  protected _tags = [CardTag.TEAM_ROCKET];

  public set: string = 'FCO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '112';
  public name: string = "Team Rocket's Handiwork";
  public fullName: string = "Team Rocket's Handiwork FCO";

  public text: string =
    "Flip 2 coins. For each heads, discard 2 cards from the top of your opponent's deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, (result) => {
        const heads = result.filter((r) => !!r).length;
        MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
          count: heads * 2,
          sourceCard: this,
        });
      });
    }

    return state;
  }
}
