import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PowerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DrawPrizesEffect } from '../../../game/store/effects/game-effects';
import { CoinFlipEffect } from '../../../game/store/effects/play-card-effects';
import {CONFIRMATION_PROMPT, GET_PLAYER_BENCH_SLOTS, IS_ABILITY_BLOCKED, TAKE_SPECIFIC_PRIZES, TAKE_X_PRIZES, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Chansey extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 110;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Lucky Bonus',
    powerType: PowerType.ABILITY,
    exemptFromAbilityLock: true,
    text: 'If you took this Pokémon as a face-down Prize card during your turn and your Bench isn\'t full, ' +
      'before you put it into your hand, you may put it onto your Bench. If you put this Pokémon onto your ' +
      'Bench in this way, flip a coin. If heads, take 1 more Prize card.'
  }];

  public attacks = [{
    name: 'Gentle Slap',
    cost: [C, C, C],
    damage: 70,
    text: ''
  }];

  public set: string = 'MEW';
  public setNumber: string = '113';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Chansey';
  public fullName: string = 'Chansey MEW';

  public abilityUsed = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DrawPrizesEffect) {
      const generator = this.handlePrizeEffect(
        () => generator.next(),
        store,
        state,
        effect
      );
      return generator.next().value;
    }
    return state;
  }

  private *handlePrizeEffect(next: Function, store: StoreLike, state: State, effect: DrawPrizesEffect): IterableIterator<State> {
    const player = effect.player;
    const prizeCard = effect.prizes.find(cardList => cardList.cards.includes(this));

    // Check if ability conditions are met
    if (!prizeCard || GET_PLAYER_BENCH_SLOTS(player).length === 0 || !prizeCard.isSecret || effect.destination !== player.hand) {
      return state;
    }

    // Prevent unintended multiple uses
    if (this.abilityUsed) {
      return state;
    }

    // Check if ability is blocked
    if (IS_ABILITY_BLOCKED(store, state, player, this)) {
      return state;
    }

    // Prevent prize card from going to hand until we complete the ability flow
    effect.preventDefault = true;

    // Ask player if they want to use the ability
    let wantToUse = false;
    yield CONFIRMATION_PROMPT(store, state, player, result => {
      wantToUse = result;
      next();
    }, GameMessage.WANT_TO_USE_ABILITY_FROM_PRIZES);

    // If the player declines, move the original prize card to hand
    const prizeIndex = player.prizes.findIndex(prize => prize.cards.includes(this));
    const fallback: (prizeIndex: number) => void = (prizeIndex) => {
      if (prizeIndex !== -1) {
        TAKE_SPECIFIC_PRIZES(store, state, player, [player.prizes[prizeIndex]], { skipReduce: true });
      }
      return;
    };

    if (!wantToUse) {
      effect.preventDefault = false;
      fallback(prizeIndex);
      return state;
    }

    // We have an all clear, so let's move the card to bench
    // (Unfortunately, we have to check this again closer to the end of the flow
    // because due to how the generator pattern works, the player could have
    // played another card to the bench)
    const emptyBenchSlots = GET_PLAYER_BENCH_SLOTS(player);

    if (emptyBenchSlots.length === 0) {
      effect.preventDefault = false;
      fallback(prizeIndex);
      return state;
    }

    // Now that we've confirmed the ability is allowed, we can update the state
    // (per wording of the ability, this still counts as a prize taken even if
    // it does not go to the player's hand)
    this.abilityUsed = true;
    player.prizesTaken += 1;

    const targetSlot = emptyBenchSlots[0];
    for (const [index, prize] of player.prizes.entries()) {
      if (prize.cards.includes(this)) {
        MOVE_CARDS(store, state, player.prizes[index], targetSlot, { sourceCard: this });
        targetSlot.pokemonPlayedTurn = state.turn;
        break;
      }
    }

    // Handle coin flip
    const coinFlip = new CoinFlipEffect(player);
    store.reduceEffect(state, coinFlip);

    if (coinFlip.result === false) {
      return state;
    }

    // Handle extra prize (excluding the group this card is in)
    yield TAKE_X_PRIZES(store, state, player, 1, {
      promptOptions: {
        blocked: effect.prizes.map(p => player.prizes.indexOf(p))
      }
    }, () => next());

    return state;
  }
} 