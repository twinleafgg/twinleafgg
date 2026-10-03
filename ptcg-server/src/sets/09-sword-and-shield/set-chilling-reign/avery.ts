import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import {
  DRAW_CARDS,
  MOVE_CARDS,
  MOVE_POKEMON_OFF_BOARD,
} from '../../../game/store/prefabs/prefabs';

//Avery is not done yet!! have to add the "remove from bench" logic

export class Avery extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CRE';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '130';

  public regulationMark = 'E';

  public name: string = 'Avery';

  public fullName: string = 'Avery CRE';

  public text: string =
    'Draw 3 cards. If you drew any cards in this way, your opponent discards Pokémon from their Bench until they have 3.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      // Draw 3 cards
      DRAW_CARDS(store, state, player, 3);

      // Get opponent
      const opponent = StateUtils.getOpponent(state, player);
      const opponentBenched = opponent.bench.reduce(
        (left, b) => left + (b.cards.length ? 1 : 0),
        0,
      );

      // Discard pokemon from opponent's bench until they have 3
      while (opponentBenched > 3) {
        const benchDifference = opponentBenched - 3;
        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            opponent.id,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            {
              allowCancel: false,
              min: benchDifference,
              max: benchDifference,
            },
          ),
          (selected: any[]): State => {
            selected.forEach((cardList: any) => {
              MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
                pokemonDestination: opponent.discard,
                sourceCard: this,
              });
            });
            return state;
          },
        );
      }

      MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [effect.trainerCard] });

      return state;
    }
    return state;
  }
}
