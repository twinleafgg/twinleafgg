import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyCard, ShuffleDeckPrompt } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: UrnOfVitality,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  const NoSingleStrikeEnergyInDiscard = player.discard.cards.some((c) => {
    return (
      c instanceof EnergyCard &&
      c.energyType === EnergyType.SPECIAL &&
      c.name === 'Single Strike Energy'
    );
  });

  if (!NoSingleStrikeEnergyInDiscard) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DECK,
      player.discard,
      { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL, name: 'Single Strike Energy' },
      { min: 1, max: 2, allowCancel: true },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: self });
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class UrnOfVitality extends TrainerCard {
  public regulationMark = 'E';

  protected _tags = [CardTag.SINGLE_STRIKE];

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '139';

  public name: string = 'Urn of Vitality';

  public fullName: string = 'Urn of Vitality BST';

  public text: string =
    'Shuffle up to 2 Single Strike Energy cards from your discard pile into' + 'your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}
