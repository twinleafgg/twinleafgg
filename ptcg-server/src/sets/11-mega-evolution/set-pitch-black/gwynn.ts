import { PokemonCard, Player } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playGwynn(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  self: Gwynn,
): IterableIterator<State> {
  const player = effect.player;

  const blocked: number[] = [];
  player.hand.cards.forEach((c, i) => {
    if (!(c instanceof PokemonCard) || c.hasRuleBox()) {
      blocked.push(i);
    }
  });

  const selectableCount = player.hand.cards.length - blocked.length;
  if (selectableCount < 2) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  let cards: typeof player.hand.cards = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      player.hand,
      {},
      { min: 1, max: 2, allowCancel: false, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: self });
  DRAW_CARDS(store, state, player, cards.length * 3);
}

export class Gwynn extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark: string = 'J';
  public set: string = 'PBL';
  public setNumber: string = '78';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Gwynn';
  public fullName: string = 'Gwynn M5';
  public text: string =
    "Discard up to 2 Pokémon that don't have a Rule Box from your hand, and draw 3 cards for each card you discarded in this way. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    const blocked: number[] = [];
    player.hand.cards.forEach((c, i) => {
      if (!(c instanceof PokemonCard) || c.hasRuleBox()) {
        blocked.push(i);
      }
    });
    if (player.hand.cards.length - blocked.length < 2) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const generator = playGwynn(() => generator.next(), store, state, effect, this);
      return generator.next().value;
    }

    return state;
  }
}
