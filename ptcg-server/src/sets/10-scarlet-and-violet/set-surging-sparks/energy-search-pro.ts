import { Card } from '../../../game/store/card/card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, CardTag, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { EnergyCard, Player, StateUtils } from '../../../game';
import {SHOW_CARDS_TO_PLAYER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

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

  const uniqueBasicEnergies = player.deck.cards
    .filter((c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC)
    .map((e) => (e as EnergyCard).provides[0])
    .filter((value, index, self) => self.indexOf(value) === index).length;

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
      { min: 0, max: uniqueBasicEnergies, allowCancel: false, differentTypes: true },
    ),
    (selected) => {
      cards = selected || [];

      if (selected.length > 1) {
        if (selected[0].name === selected[1].name) {
          throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
        }
      }

      SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

      MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: effect.trainerCard });
    },
  );

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class EnergySearchPro extends TrainerCard {
  protected _tags = [CardTag.ACE_SPEC];

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'H';

  public setNumber = '176';

  public set: string = 'SSP';

  public name: string = 'Energy Search Pro';

  public fullName: string = 'Energy Search Pro SSP';

  public cardImage: string = 'assets/cardback.png';

  public text: string =
    'Search your deck for any number of Basic Energy cards of different types, reveal them, and put them into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
