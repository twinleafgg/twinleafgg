import { GameError, GameMessage, PokemonCard } from '../../../game';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ProfessorElmsTrainingMethod extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';
  public name: string = "Professor Elm's Training Method";
  public fullName: string = "Professor Elm's Training Method UF";

  public text: string =
    'Search your deck for an Evolution card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        // eslint-disable-next-line no-empty
        if (card instanceof PokemonCard && card.evolvesFrom !== '' && card.stage !== Stage.LV_X) {
        } else {
          blocked.push(index);
        }
      });

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        player,
        {},
        { min: 0, max: 1, blocked },
      );
      return state;
    }

    return state;
  }
}
