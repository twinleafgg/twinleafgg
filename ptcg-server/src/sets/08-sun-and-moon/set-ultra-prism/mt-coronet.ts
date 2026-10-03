import {
  Card,
  ChooseCardsPrompt,
  EnergyCard,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { DiscardToHandEffect } from '../../../game/store/effects/play-card-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useStadium(
  next: Function,
  store: StoreLike,
  state: State,
  effect: UseStadiumEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  let basicEnergyInDiscard: number = 0;
  const blocked: number[] = [];
  player.discard.cards.forEach((c, index) => {
    const isPokemon =
      c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Metal Energy';
    if (isPokemon) {
      basicEnergyInDiscard += 1;
    } else {
      blocked.push(index);
    }
  });

  if (basicEnergyInDiscard === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let cards: Card[] = [];
  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.discard,
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
      { min: Math.min(basicEnergyInDiscard, 2), max: 2, allowCancel: false, blocked },
    ),
    (selectedCards) => {
      cards = selectedCards || [];

      // Operation canceled by the user
      if (cards.length === 0) {
        return state;
      }

      if (cards.length > 0) {
        store.prompt(
          state,
          new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
          () => next(),
        );
      }

      cards.forEach((card, index) => {
        MOVE_CARDS(store, state, player.discard, player.hand, {
          cards: [card],
          sourceCard: effect.stadium,
        });
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
        return state;
      });
    },
  );
}

export class MtCoronet extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '130';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'UPR';

  public name = 'Mt. Coronet';

  public fullName = 'Mt. Coronet UPR';

  public text =
    "Once during each player's turn, that player may put 2 [M] Energy cards from their discard pile into their hand.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      // Check if DiscardToHandEffect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        // If prevented, just discard the card and return
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [effect.stadium],
          sourceCard: this,
        });
        return state;
      }

      const generator = useStadium(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
