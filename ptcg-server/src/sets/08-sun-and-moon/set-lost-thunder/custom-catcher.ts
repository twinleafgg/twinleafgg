import {
  ChoosePokemonPrompt,
  ConfirmPrompt,
  PlayerType,
  PokemonCardList,
  SlotType,
  StateUtils,
} from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameLog, GameMessage } from '../../../game/game-message';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  const name = effect.trainerCard.name;

  // Don't allow to play both cross switchers when opponen has an empty bench
  const benchCount = opponent.bench.reduce((sum, b) => {
    return sum + (b.cards.length > 0 ? 1 : 0);
  }, 0);

  //let playTwoCards = false;

  if (benchCount > 0) {
    // playTwoCards = true;

    // Discard second Cross Switcher +
    const second = player.hand.cards.find((c) => {
      return c.name === name && c !== effect.trainerCard;
    });
    if (second !== undefined) {
      MOVE_CARDS(store, state, player.hand, player.discard, {
        cards: [second],
        sourceCard: effect.trainerCard,
      });
    }

    const hasBench = player.bench.some((b) => b.cards.length > 0);

    if (hasBench === false) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    // We will discard this card after prompt confirmation
    effect.preventDefault = true;

    return store.prompt(
      state,
      new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false },
      ),
      (targets) => {
        if (!targets || targets.length === 0) {
          return;
        }
        opponent.active.clearEffects();
        opponent.switchPokemon(targets[0]);
        next();

        // Do not discard the card yet
        effect.preventDefault = true;

        let target: PokemonCardList[] = [];
        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_SWITCH,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { allowCancel: false },
          ),
          (results) => {
            target = results || [];
            next();

            if (target.length === 0) {
              return state;
            }

            // Discard trainer only when user selected a Pokemon
            player.active.clearEffects();
            player.switchPokemon(target[0]);

            return state;
          },
        );
      },
    );
  }
}

export class CustomCatcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'LOT';
  public name: string = 'Custom Catcher';
  public fullName: string = 'Custom Catcher LOT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '171';

  public text: string = `You may play 2 Custom Catcher cards at once.

  • If you played 1 card, draw cards until you have 3 cards in your hand.
  • If you played 2 cards, switch 1 of your opponent's Benched Pokémon with their Active Pokémon. (This effect works one time for 2 cards.)`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      let drawUpToThree = false;

      const count = player.hand.cards.reduce((sum, c) => {
        return sum + (c.name === this.name ? 1 : 0);
      }, 0);

      if (count > 1) {
        state = store.prompt(
          state,
          new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_PLAY_BOTH_CARDS_AT_ONCE),
          (wantToUse) => {
            if (!wantToUse) {
              drawUpToThree = true;
            } else {
              const generator = playCard(() => generator.next(), store, state, effect);
              return generator.next().value;
            }
          },
        );
      } else {
        drawUpToThree = true;
      }

      if (drawUpToThree) {
        const cards = player.hand.cards.filter((c) => c !== this);
        const cardsToDraw = Math.max(0, 3 - cards.length);

        if (cardsToDraw === 0 || player.deck.cards.length === 0) {
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }

        MOVE_CARDS(store, state, player.deck, player.hand, {
          count: cardsToDraw,
          sourceCard: this,
        });
        MOVE_CARDS(store, state, player.supporter, player.discard, {
          cards: [this],
          sourceCard: this,
        });

        for (let i = 0; i < cardsToDraw; i++) {
          store.log(state, GameLog.LOG_PLAYER_DRAWS_CARD, { name: player.name });
        }
      }
    }

    return state;
  }
}
