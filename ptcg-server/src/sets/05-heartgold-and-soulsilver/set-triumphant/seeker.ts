import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Player } from '../../../game/store/state/player';
import { StateUtils } from '../../../game/store/state-utils';
import { MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';

function pickUpBenchedPokemon(
  next: Function,
  store: StoreLike,
  state: State,
  player: Player,
  sourceCard: TrainerCard,
): State {
  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.BENCH],
      { allowCancel: false },
    ),
    (selection) => {
      const cardList = selection[0];
      MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
        pokemonDestination: player.hand,
        sourceCard,
      });
      next();
    },
  );
}

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const playerHasBench = player.bench.some((b) => b.cards.length > 0);
  const opponentHasBench = opponent.bench.some((b) => b.cards.length > 0);

  if (!playerHasBench && !opponentHasBench) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (playerHasBench) {
    yield pickUpBenchedPokemon(next, store, state, player, effect.trainerCard);
  }

  if (opponentHasBench) {
    yield pickUpBenchedPokemon(next, store, state, opponent, effect.trainerCard);
  }

  return state;
}

export class Seeker extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'TM';

  public name: string = 'Seeker';

  public fullName: string = 'Seeker TRM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '88';

  public text: string =
    'Each player returns 1 of his or her Benched Pokemon and all cards ' +
    'attached to it to his or her hand. (You return your Pokemon first.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
