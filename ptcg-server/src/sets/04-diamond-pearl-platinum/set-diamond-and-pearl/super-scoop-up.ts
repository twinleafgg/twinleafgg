import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PlayerType, SlotType } from '../../../game';
import {
  MOVE_CARDS,
  COIN_FLIP_PROMPT,
  MOVE_POKEMON_OFF_BOARD,
} from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  let coinResult: boolean = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coinResult = result;
    next();
  });

  if (coinResult === false) {
    MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [effect.trainerCard] });
    return state;
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false },
    ),
    (result) => {
      const cardList = result.length > 0 ? result[0] : null;
      if (cardList !== null) {
        MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
          pokemonDestination: player.hand,
          sourceCard: effect.trainerCard,
        });
        MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [effect.trainerCard] });
      }
    },
  );
}

export class SuperScoopUp extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'DP';
  public name: string = 'Super Scoop Up';
  public fullName: string = 'Super Scoop Up DP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '115';

  public text: string =
    'Flip a coin. If heads, put 1 of your Pokemon ' +
    'and all cards attached to it into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
