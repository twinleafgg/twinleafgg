import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { CardList, ChooseCardsPrompt, Player } from '../../../game';
import {
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: Hassel,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

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

  // No Pokemon KO last turn
  if (!player.marker.hasMarker(self.HASSEL_MARKER)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  const deckTop = new CardList();
  MOVE_CARDS(store, state, player.deck, deckTop, { count: 8, sourceCard: self });

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      deckTop,
      {},
      { min: 0, max: 3, allowCancel: false },
    ),
    (selected) => {
      MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: self });
      MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: self });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
        return state;
      });
    },
  );
}

export class Hassel extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'TWM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '151';

  public regulationMark = 'H';

  public name: string = 'Hassel';

  public fullName: string = 'Hassel TWM';

  public text: string =
    "You can play this card only if any of your Pokémon were Knocked Out during your opponent's last turn. Look at the top 8 cards of your deck. Put up to 3 of them into your hand, and shuffle the rest into your deck.";

  public readonly HASSEL_MARKER = 'HASSEL_MARKER';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const duringTurn = [GamePhase.PLAYER_TURN, GamePhase.ATTACK].includes(state.phase);

      // Do not activate between turns, or when it's not opponents turn.
      if (!duringTurn || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) {
        effect.player.marker.addMarker(this.HASSEL_MARKER, this);
      }
      return state;
    }

    REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, this.HASSEL_MARKER, this);

    return state;
  }
}
