import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
  GameError,
} from '../../../game';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';

export class PokemonReversal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'UF';
  public name: string = 'Pokémon Reversal';
  public fullName: string = 'Pokemon Reversal UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';

  public text =
    "Flip a coin. If heads, choose 1 of your opponent's Benched Pokémon and switch it with your opponent's Active Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const benchCount = opponent.bench.reduce((sum, b) => {
        return sum + (b.cards.length > 0 ? 1 : 0);
      }, 0);

      if (benchCount === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return COIN_FLIP_PROMPT(store, state, player, (flipResult) => {
        if (flipResult) {
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_SWITCH,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { allowCancel: false },
            ),
            (result) => {
              const cardList = result && result[0];
              if (cardList) {
                opponent.switchPokemon(cardList);
              }
            },
          );
        }
      });
    }

    return state;
  }
}
