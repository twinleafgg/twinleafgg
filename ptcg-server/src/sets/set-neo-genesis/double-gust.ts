import { Effect } from '../../game/store/effects/effect';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
  GameError,
} from '../../game';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';

export class DoubleGust extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'N1';
  public name: string = 'Double Gust';
  public fullName: string = 'Double Gust N1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '100';
  public text =
    'If you have any Benched Pokémon, your opponent chooses 1 of them and switches it with your Active Pokémon. Then, if your opponent has any Benched Pokémon, choose 1 of them and switch it with his or her Active Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const oppBenchCount = opponent.bench.reduce((sum, b) => {
        return sum + (b.cards.length > 0 ? 1 : 0);
      }, 0);

      const playerBenchCount = player.bench.reduce((sum, b) => {
        return sum + (b.cards.length > 0 ? 1 : 0);
      }, 0);

      if (!oppBenchCount && !playerBenchCount) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Opponent gust effect
      store.prompt(
        state,
        new ChoosePokemonPrompt(
          opponent.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { min: 0, allowCancel: false },
        ),
        (result) => {
          const cardList = result && result[0];
          if (cardList) {
            player.switchPokemon(cardList);
          }
          // Player gust effect
          store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_SWITCH,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { min: 0, allowCancel: false },
            ),
            (result) => {
              const cardList = result && result[0];
              if (cardList) {
                opponent.switchPokemon(cardList);
              }
            },
          );
        },
      );
    }

    return state;
  }
}
