import { Card, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function isPalmerTarget(card: Card): boolean {
  if (card instanceof PokemonCard) {
    return true;
  }
  return card instanceof EnergyCard && card.energyType === EnergyType.BASIC;
}

function* playCard(next: Function, store: StoreLike, state: State, self: PalmersContribution, effect: TrainerEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (!player.discard.cards.some(c => isPalmerTarget(c))) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });
  effect.preventDefault = true;

  const blocked: number[] = [];
  player.discard.cards.forEach((c, index) => {
    if (!isPalmerTarget(c)) {
      blocked.push(index);
    }
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_DECK,
    player.discard,
    {},
    { min: 0, max: 5, allowCancel: false, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > 0) {
    SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
    MOVE_CARDS(store, state, player.discard, player.deck, { cards, sourceCard: self });
    return SHUFFLE_DECK(store, state, player);
  }

  return state;
}

export class PalmersContribution extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '139';
  public name: string = 'Palmer\'s Contribution';
  public fullName: string = 'Palmer\'s Contribution SV';
  public text: string = 'Search your discard pile for up to 5 in any combination of Pokémon and basic Energy cards. Show them to your opponent and shuffle them into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
