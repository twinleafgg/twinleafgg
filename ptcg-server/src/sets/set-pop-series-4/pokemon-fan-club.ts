import { Effect } from '../../game/store/effects/effect';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType, SuperType, Stage } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class PokemonFanClub extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'P4';
  public name: string = 'Pokémon Fan Club';
  public fullName: string = 'Pokémon Fan Club P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';

  public text: string =
    'Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
        store,
        state,
        player,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: 2 },
      );

      MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });
    }

    return state;
  }
}
