import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function* playCard(next: Function, store: StoreLike, state: State, self: CyrussConspiracy, effect: TrainerEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const allFound: Card[] = [];

  const supporterBlocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof TrainerCard) || card.trainerType !== TrainerType.SUPPORTER) {
      supporterBlocked.push(index);
    }
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
    { min: 0, max: 1, allowCancel: false, blocked: supporterBlocked }
  ), selected => {
    allFound.push(...(selected || []));
    next();
  });

  const energyBlocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof EnergyCard) || card.energyType !== EnergyType.BASIC || allFound.includes(card)) {
      energyBlocked.push(index);
    }
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
    { min: 0, max: 1, allowCancel: false, blocked: energyBlocked }
  ), selected => {
    allFound.push(...(selected || []));
    next();
  });

  const inventionBlocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof TrainerCard) || !card.name.includes('Team Galactic\'s Invention') || allFound.includes(card)) {
      inventionBlocked.push(index);
    }
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    { superType: SuperType.TRAINER },
    { min: 0, max: 1, allowCancel: false, blocked: inventionBlocked }
  ), selected => {
    allFound.push(...(selected || []));
    next();
  });

  if (allFound.length > 0) {
    SHOW_CARDS_TO_PLAYER(store, state, opponent, allFound);
    MOVE_CARDS(store, state, player.deck, player.hand, { cards: allFound, sourceCard: self });
  }

  return SHUFFLE_DECK(store, state, player);
}

export class CyrussConspiracy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Cyrus\'s Conspiracy';
  public fullName: string = 'Cyrus\'s Conspiracy PL';
  public text: string = 'You can play only one Supporter card each turn. When you play this card, put it next to your Active Pokémon. When your turn ends, discard this card. Search your deck for a Supporter card, a basic Energy card, and a Trainer card that has Team Galactic\'s Invention in its name, show them to your opponent, and put them into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
