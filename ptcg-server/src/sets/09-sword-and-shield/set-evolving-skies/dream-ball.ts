import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { DrawPrizesEffect } from '../../../game/store/effects/game-effects';
import { StoreLike, State, PokemonCard, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH,
  CONFIRMATION_PROMPT,
  GET_PLAYER_BENCH_SLOTS,
  TAKE_SPECIFIC_PRIZES, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';

export class DreamBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'E';

  public set: string = 'EVS';

  public setNumber: string = '146';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Dream Ball';

  public fullName: string = 'Dream Ball EVS';

  public text: string =
    'You can play this card only if you took it as a face-down Prize card, before you put it into your hand. ' +
    `
    ` +
    'Search your deck for a Pokémon and put it onto your Bench. Then, shuffle your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
    }

    // Only act when this card is drawn as a Prize.
    if (effect instanceof DrawPrizesEffect) {
      const generator = this.handlePrizeEffect(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }

  private *handlePrizeEffect(
    next: Function,
    store: StoreLike,
    state: State,
    effect: DrawPrizesEffect,
  ): IterableIterator<State> {
    const player = effect.player;
    const prizeCard = effect.prizes.find((cardList) => cardList.cards.includes(this));

    // Check if play conditions are met
    if (
      !prizeCard ||
      GET_PLAYER_BENCH_SLOTS(player).length === 0 ||
      !prizeCard.isSecret ||
      effect.destination !== player.hand
    ) {
      return state;
    }

    // Prevent prize card from going to hand until we complete the card effect flow
    effect.preventDefault = true;

    // Ask player if they want to use the card
    let wantToUse = false;
    yield CONFIRMATION_PROMPT(
      store,
      state,
      player,
      (result) => {
        wantToUse = result;
        next();
      },
      GameMessage.WANT_TO_USE_ITEM_FROM_PRIZES,
    );

    // If the player declines, move the original prize card to hand
    if (!wantToUse) {
      effect.preventDefault = false;
      const prizeIndex = player.prizes.findIndex((prize) => prize.cards.includes(this));
      if (prizeIndex !== -1) {
        TAKE_SPECIFIC_PRIZES(store, state, player, [player.prizes[prizeIndex]], {
          skipReduce: true,
        });
      }
      return state;
    }

    // If the player agrees, discard Dream Ball
    // (Unfortunately, we have to check this again closer to the end of the flow
    // because due to how the generator pattern works, the player could have
    // played another card to the bench)
    for (const [index, prize] of player.prizes.entries()) {
      if (prize.cards.includes(this)) {
        MOVE_CARDS(store, state, player.prizes[index], player.discard, { sourceCard: this });
        break;
      }
    }

    // Search for a Pokémon and put it onto the bench
    const emptyBenchSlots = GET_PLAYER_BENCH_SLOTS(player);

    if (emptyBenchSlots.length === 0) {
      return state;
    }

    // Can't search for Pokémon with specific "coming into play" rules
    const searchBlocked: number[] = [];
    player.deck.cards.forEach((card, index) => {
      if (
        card instanceof PokemonCard &&
        (card.hasTag(CardTag.POKEMON_LV_X) ||
          card.hasTag(CardTag.LEGEND) ||
          card.hasTag(CardTag.BREAK) ||
          card.hasTag(CardTag.POKEMON_VUNION))
      ) {
        searchBlocked.push(index);
      }
    });

    MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });

    yield SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
      store,
      state,
      player,
      {},
      { min: 1, max: 1, allowCancel: false, blocked: searchBlocked },
    );

    return state;
  }
}
