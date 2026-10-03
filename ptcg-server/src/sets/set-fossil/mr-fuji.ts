import { Effect } from '../../game/store/effects/effect';
import { GameMessage } from '../../game/game-message';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import {
  ShuffleDeckPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
  GameError,
} from '../../game';
import { MOVE_POKEMON_OFF_BOARD } from '../../game/store/prefabs/prefabs';

export class MrFuji extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'FO';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '58';

  public name: string = 'Mr. Fuji';

  public fullName: string = 'Mr. Fuji FO';

  public text: string =
    'Choose a Pokémon on your Bench. Shuffle it and any cards attached to it into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const hasBenched = player.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
        ),
        (selected) => {
          const target = selected[0];

          MOVE_POKEMON_OFF_BOARD(store, state, target, {
            pokemonDestination: player.deck,
            sourceCard: this,
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);

            return state;
          });
        },
      );
    }
    return state;
  }
}
