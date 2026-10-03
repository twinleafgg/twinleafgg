import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  PlayerType,
  SlotType,
  StateUtils,
  GameError,
  GameMessage,
  Card,
  CardTarget,
  ChooseCardsPrompt,
  CardList,
} from '../../../game';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: GreatCatcher,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  // If opponent doesn't have any valid cards on their bench,
  // or if we don't have at least two cards in hand, we can't play this card.
  const hasBench = opponent.bench.some(
    (b) =>
      b.getPokemonCard()?.hasTag(CardTag.POKEMON_GX) ||
      b.getPokemonCard()?.hasTag(CardTag.POKEMON_EX),
  );
  const cards: Card[] = player.hand.cards.filter((c) => c !== self);
  if (!hasBench || cards.length < 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  // Discard cards (excluding this card from the prompt)
  const handTemp = new CardList();
  handTemp.cards = cards;
  let discardCards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      handTemp,
      {},
      { min: 2, max: 2, allowCancel: true },
    ),
    (selected) => {
      discardCards = selected || [];
      next();
    },
  );

  if (discardCards.length == 0) {
    return state;
  } // Operation canceled by the user

  // Can't cancel next prompt, so now discard things
  MOVE_CARDS(store, state, player.hand, player.discard, { cards: [self], sourceCard: self });
  MOVE_CARDS(store, state, player.hand, player.discard, { cards: discardCards, sourceCard: self });

  // Can only gust EX or GX
  const gustBlocked: CardTarget[] = [];
  opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cards, card, target) => {
    if (!card.hasTag(CardTag.POKEMON_GX) && !card.hasTag(CardTag.POKEMON_EX)) {
      gustBlocked.push(target);
    }
  });

  // Gust effect
  return store.prompt(
    state,
    new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON_TO_SWITCH,
      PlayerType.TOP_PLAYER,
      [SlotType.BENCH],
      { allowCancel: false, blocked: gustBlocked },
    ),
    (result) => {
      const cardList = result && result[0];
      if (cardList) {
        opponent.switchPokemon(cardList);
      }
    },
  );
}

export class GreatCatcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'CEC';

  public setNumber = '192';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Great Catcher';

  public fullName: string = 'Great Catcher CEC';

  public text: string =
    "You can play this card only if you discard two other cards. Switch 1 of your opponent's Benched Pokemon-GX or Pokemon-EX " +
    'with their Active Pokemon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
