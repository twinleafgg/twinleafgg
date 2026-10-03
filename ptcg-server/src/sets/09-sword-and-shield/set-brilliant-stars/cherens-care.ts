import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { pokemonHasCardType } from '../../../game';
import { MOVE_CARDS, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  // Create list of non - Pokemon SP slots
  const blocked: CardTarget[] = [];
  let hasColorlessPokemon = false;

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    const isColorlessPokemon = pokemonHasCardType(card, CardType.COLORLESS);
    hasColorlessPokemon = hasColorlessPokemon || isColorlessPokemon;
    if (!isColorlessPokemon) {
      blocked.push(target);
    }
  });

  if (!hasColorlessPokemon) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { min: 1, max: 1, allowCancel: true, blocked },
    ),
    (result) => {
      const cardList = result.length > 0 ? result[0] : null;
      if (cardList !== null) {
        MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
          pokemonDestination: player.hand,
          sourceCard: effect.trainerCard,
        });
      }
    },
  );
}

export class CherensCare extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'F';

  public set: string = 'BRS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '134';

  public name: string = "Cheren's Care";

  public fullName: string = "Cheren's Care BRS";

  public text: string =
    'Put 1 of your [C] Pokémon that has any damage counters on it and all attached cards into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
