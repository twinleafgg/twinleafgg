import { GameError, PokemonCard, pokemonHasCardType } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Piers,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let energy = 0;
  let pokemon = 0;
  const blocked: number[] = [];
  player.deck.cards.forEach((c, index) => {
    if (c.superType === SuperType.ENERGY) {
      energy += 1;
    } else if (c instanceof PokemonCard && pokemonHasCardType(c, CardType.DARK)) {
      pokemon += 1;
    } else {
      blocked.push(index);
    }
  });

  // Limit max for each type to 1
  const maxEnergy = Math.min(energy, 1);
  const maxPokemon = Math.min(pokemon, 1);

  // Total max is sum of max for each
  const count = maxEnergy + maxPokemon;

  // Pass max counts to prompt options
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_ONE_DARK_POKEMON_AND_ONE_ENERGY_TO_HAND,
      player.deck,
      {},
      {
        min: 0,
        max: count,
        allowCancel: false,
        blocked,
        maxEnergies: maxEnergy,
        maxPokemons: maxPokemon,
      },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  player.playedPiers = true;
  MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: self });

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Piers extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'D';
  public set: string = 'CPA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '58';
  public name: string = 'Piers';
  public fullName: string = 'Piers CPA';
  public text: string =
    'Search your deck for an Energy card and a [D] Pokémon, reveal them, and put them into your hand. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.playedPiers = false;
    }

    return state;
  }
}
