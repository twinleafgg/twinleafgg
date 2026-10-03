import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { CardList } from '../../../game/store/state/card-list';
import { StateUtils } from '../../../game/store/state-utils';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: ZinniasResolve,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  let cards: Card[] = [];

  cards = player.hand.cards.filter((c) => c !== self);
  if (cards.length < 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // // We will discard this card after prompt confirmation
  // effect.preventDefault = true;

  // prepare card list without Junk Arm
  const handTemp = new CardList();
  handTemp.cards = player.hand.cards.filter((c) => c !== self);

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      handTemp,
      {},
      { min: 2, max: 2, allowCancel: false },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: self });

  const opponent = StateUtils.getOpponent(state, player);
  const cardsToDraw = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);

  DRAW_CARDS(store, state, player, cardsToDraw);
  return state;
}
export class ZinniasResolve extends TrainerCard {
  public regulationMark = 'E';
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'EVS';
  public setNumber: string = '164';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Zinnia's Resolve";
  public fullName: string = "Zinnia's Resolve EVS";

  public text: string = `You can play this card only if you discard 2 other cards from your hand.

Draw a card for each of your opponent's Pokémon in play.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
