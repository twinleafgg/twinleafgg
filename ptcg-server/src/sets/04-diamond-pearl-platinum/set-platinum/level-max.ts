import { CardManager } from '../../../game/cards/card-manager';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { Card } from '../../../game/store/card/card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {SHUFFLE_DECK, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';

import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Look through all known cards to find Level X Pokemon that can evolve from Pokemon in play
  const cm = CardManager.getInstance();
  const evolutions = cm.getAllCards().filter((c) => {
    return c instanceof PokemonCard && c.stage === Stage.LV_X;
  }) as PokemonCard[];

  // Build possible evolution card names
  const evolutionNames: string[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    const valid = evolutions.filter((e) => e.evolvesFrom === card.name);
    valid.forEach((c) => {
      if (!evolutionNames.includes(c.name)) {
        evolutionNames.push(c.name);
      }
    });
  });

  // There is nothing that can evolve
  if (evolutionNames.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Flip a coin - the effect only works on heads
  let coinFlipResult: boolean = false;
  yield COIN_FLIP_PROMPT(store, state, player, (result) => {
    coinFlipResult = result;
    next();
  });

  // If tails, discard the card and do nothing
  if (!coinFlipResult) {
    return state;
  }

  // Blocking pokemon cards, that cannot be valid evolutions
  // Block any card that is not a Level X Pokemon, or is a Level X but not in the valid evolution names
  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof PokemonCard)) {
      // Block non-Pokemon cards
      blocked.push(index);
    } else if (card.stage !== Stage.LV_X) {
      // Block Pokemon cards that are not Level X
      blocked.push(index);
    } else if (!evolutionNames.includes(card.name)) {
      // Block Level X Pokemon that are not valid evolutions
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_EVOLVE,
      player.deck,
      { superType: SuperType.POKEMON, stage: Stage.LV_X },
      { min: 0, max: 1, allowCancel: false, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length === 0) {
    return state; // canceled by user
  }

  const evolution = cards[0] as PokemonCard;

  const blocked2: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
    if (card.name !== evolution.evolvesFrom) {
      blocked2.push(target);
    }
  });

  let targets: PokemonCardList[] = [];
  yield store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false, blocked: blocked2 },
    ),
    (selection) => {
      targets = selection || [];
      next();
    },
  );

  if (targets.length === 0) {
    SHUFFLE_DECK(store, state, player);
    return state; // canceled by user
  }
  const pokemonCard = targets[0].getPokemonCard();

  if (pokemonCard === undefined) {
    return state; // invalid target?
  }

  // Evolve Pokemon
  MOVE_CARDS(store, state, player.deck, targets[0], { cards: [evolution], sourceCard: effect.trainerCard });
  targets[0].clearEffects();
  targets[0].pokemonPlayedTurn = state.turn;

  SHUFFLE_DECK(store, state, player);
}

export class LevelMax extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'PL';
  public name: string = 'Level Max';
  public fullName: string = 'Level Max PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '107';

  public text: string =
    'Flip a coin. If heads, search your deck for a Pokémon LV.X that levels up from 1 of your Pokémon, and put it onto that Pokémon. (This counts as leveling up that Pokémon.) Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
