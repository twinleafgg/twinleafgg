import {
  Card,
  ChooseCardsPrompt,
  PokemonCard,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  pokemonHasCardType,
} from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
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

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const blocked: number[] = [];

  player.deck.cards.forEach((card, index) => {
    // eslint-disable-next-line no-empty
    if (
      card instanceof PokemonCard &&
      card.stage !== Stage.BASIC &&
      card.stage !== Stage.RESTORED &&
      pokemonHasCardType(card, CardType.GRASS)
    ) {
    } else {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.POKEMON },
      { min: 0, max: 1, allowCancel: false, blocked },
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
        MOVE_CARDS(store, state, player.deck, player.hand, {
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

export class TurffieldStadium extends TrainerCard {
  public regulationMark = 'D';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '68';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'CPA';

  public name = 'Turffield Stadium';

  public fullName = 'Turffield Stadium CPA';

  public text =
    "Once during each player's turn, that player may search their deck for an Evolution [G] Pokémon, reveal it, and put it into their hand. Then, that player shuffles their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const generator = useStadium(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
