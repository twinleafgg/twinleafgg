import {
  Card,
  EnergyCard,
  GameError,
  GameMessage,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Volkner extends TrainerCard {
  public set: string = 'UPR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '135';

  public name: string = 'Volkner';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public fullName: string = 'Volkner UPR';

  public text =
    'Search your deck for an Item card and a [L] Energy card, reveal them, and put them into your hand. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Volkner,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  const supporterTurn = player.supporterTurn;

  if (supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: self,
  });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  // Count energy and items separately
  let energy = 0;
  let items = 0;
  const blocked: number[] = [];
  player.deck.cards.forEach((c, index) => {
    if (
      c instanceof EnergyCard &&
      c.energyType === EnergyType.BASIC &&
      c.name === 'Lightning Energy'
    ) {
      energy += 1;
    } else if (c instanceof TrainerCard && c.trainerType === TrainerType.ITEM) {
      items += 1;
    } else {
      blocked.push(index);
    }
  });

  // Limit max for each type to 1
  const maxEnergies = Math.min(energy, 1);
  const maxItems = Math.min(items, 1);

  // Total max is sum of max for each
  const count = maxEnergies + maxItems;

  // Pass max counts to prompt options
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_ONE_ITEM_AND_ONE_LIGHTNING_ENERGY_TO_HAND,
      player.deck,
      {},
      { min: 0, max: count, allowCancel: false, blocked, maxEnergies, maxItems },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });

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
