import { Card } from '../../../game/store/card/card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { Player, PokemonCardList } from '../../../game';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

  // No cards left in deck
  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }
  // Check if bench has open slots
  const openSlots = player.bench.filter((b) => b.cards.length === 0);

  // No open slots, throw error
  if (openSlots.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
      player.deck,
      { superType: SuperType.POKEMON, stage: Stage.BASIC },
      { min: 0, max: 1, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  // Operation canceled by the user
  if (cards.length === 0) {
    SHUFFLE_DECK(store, state, player);
    return state;
  }

  // Use the new PlayPokemonFromDeckEffect for each selected card
  cards.forEach((card, index) => {
    const playPokemonFromDeckEffect = new PlayPokemonFromDeckEffect(
      player,
      card as any,
      slots[index],
    );
    store.reduceEffect(state, playPokemonFromDeckEffect);
  });

  SHUFFLE_DECK(store, state, player);
  return state;
}
export class NestBall extends TrainerCard {
  public regulationMark = 'G';
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SVI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '181';
  public name: string = 'Nest Ball';
  public fullName: string = 'Nest Ball SVI';
  public text: string =
    'Search your deck for a Basic Pokémon and put it onto your Bench. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // No cards left in deck, return false
    if (player.deck.cards.length === 0) {
      return false;
    }
    // Check if bench has open slots
    const openSlots = player.bench.filter((b) => b.cards.length === 0);

    // No open slots, return false
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
