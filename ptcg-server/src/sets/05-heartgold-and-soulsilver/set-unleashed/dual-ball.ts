import {
  Card,
  CardTag,
  GameError,
  GameMessage,
  Player,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {
  MULTIPLE_COIN_FLIPS_PROMPT,
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

  let heads = 0;
  yield MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, (results) => {
    results.forEach((r) => {
      heads += r ? 1 : 0;
    });
    next();
  });

  if (heads === 0) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.POKEMON, stage: Stage.BASIC },
      { allowCancel: true, min: 0, max: heads },
    ),
    (results) => {
      cards = results || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: effect.trainerCard });

  if (cards.length > 0) {
    SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
  }

  return SHUFFLE_DECK(store, state, player);
}

export class DualBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Dual Ball';
  public fullName: string = 'Dual Ball UL';

  public text: string =
    'Flip 2 coins. For each heads, search your deck for a Basic Pokemon ' +
    'card, show it to your opponent, and put it into your hand. Shuffle your ' +
    'deck afterward.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      if (effect.player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
