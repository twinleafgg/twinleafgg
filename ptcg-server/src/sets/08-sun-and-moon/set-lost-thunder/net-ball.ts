import {
  EnergyCard,
  PokemonCard,
  StateUtils,
  pokemonHasCardType,
  GameError,
  GameMessage,
  ChooseCardsPrompt,
  Player,
  State,
  StoreLike,
  TrainerCard,
  Card,
} from '../../../game';
import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  TrainerType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    const isBasicGrassPokemon =
      card instanceof PokemonCard &&
      card.stage === Stage.BASIC &&
      pokemonHasCardType(card, CardType.GRASS);
    const isGrassEnergy =
      card instanceof EnergyCard &&
      card.energyType === EnergyType.BASIC &&
      card.name === 'Grass Energy';
    if (!isBasicGrassPokemon && !isGrassEnergy) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      {},
      { min: 0, max: 1, allowCancel: true, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  // Operation canceled by the user
  if (cards.length === 0) {
    return state;
  }

  MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: effect.trainerCard });
  SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

  return SHUFFLE_DECK(store, state, player);
}

export class NetBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'LOT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '187';
  public name: string = 'Net Ball';
  public fullName: string = 'Net Ball LOT';

  public text: string =
    'Search your deck for a Basic [G] Pokémon or a [G] Energy card, reveal it, and put it into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
