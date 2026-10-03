import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PlayerType, SlotType, GameMessage, GameError, GamePhase } from '../../../game';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';

export class Cofagrigus2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Yamask';
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: D }];
  public retreat = [C, C];

  public powers = [{
    name: 'Chuck into the Chest',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may choose a Pokémon from your Bench (excluding any Cofagrigus) and put it on top of your face-down Prize cards. If you do, put 1 of your face-down Prize cards onto your Bench. (You can\'t use this Ability if your Bench is full.) This ends your turn.'
  }];

  public attacks = [{
    name: 'Hex',
    cost: [P, C],
    damage: 0,
    text: 'Put 4 damage counters on the Defending Pokémon.'
  }];

  public set: string = 'NVI';
  public setNumber: string = '47';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Cofagrigus';
  public fullName: string = 'Cofagrigus NVI 47';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Chuck into the Chest
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Check for available bench slot
      const hasEmptyBenchSlot = player.bench.some(b => b.cards.length === 0);
      if (!hasEmptyBenchSlot) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Check for eligible benched Pokémon (not Cofagrigus)
      const eligibleBench = player.bench.filter(b =>
        b.cards.length > 0 &&
        b.getPokemonCard()?.name !== 'Cofagrigus'
      );

      if (eligibleBench.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Check for face-down prize cards
      const faceDownPrizes = player.prizes.filter(p => p.cards.length > 0);
      if (faceDownPrizes.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Choose a benched Pokémon
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: true }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }

        const benchSlot = targets[0];
        const pokemonCard = benchSlot.getPokemonCard();

        if (!pokemonCard || pokemonCard.name === 'Cofagrigus') {
          return;
        }

        // Move bench Pokémon to prizes (on top)
        const cardsToMove = benchSlot.cards.slice();

        // Find an empty prize slot or use the first one
        const targetPrize = player.prizes.find(p => p.cards.length === 0) || player.prizes[0];

        // Actually, we need to place the pokemon on TOP of prize cards
        // Move all cards from bench to a prize pile
        cardsToMove.forEach(card => {
          MOVE_CARDS(store, state, benchSlot, targetPrize, { cards: [card], sourceCard: this });
        });
        benchSlot.clearEffects();
        targetPrize.isSecret = true;

        // Take a random prize card and put it on bench
        const availablePrizes = player.prizes.filter(p => p.cards.length > 0 && p !== targetPrize);
        if (availablePrizes.length === 0) {
          state.phase = GamePhase.BETWEEN_TURNS;
          return;
        }

        const randomPrizeIndex = Math.floor(Math.random() * availablePrizes.length);
        const chosenPrize = availablePrizes[randomPrizeIndex];

        // Find empty bench slot
        const emptyBench = player.bench.find(b => b.cards.length === 0);
        if (emptyBench && chosenPrize.cards.length > 0) {
          const prizeCard = chosenPrize.cards[0];
          if (prizeCard.superType === SuperType.POKEMON) {
            MOVE_CARDS(store, state, chosenPrize, emptyBench, { cards: [prizeCard], sourceCard: this });
            emptyBench.pokemonPlayedTurn = state.turn;
          } else {
            // If it's not a Pokémon, put it in hand instead
            MOVE_CARDS(store, state, chosenPrize, player.hand, { sourceCard: this });
          }
        }

        // End turn
        state.phase = GamePhase.BETWEEN_TURNS;
      });
    }

    // Hex - put 4 damage counters
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      opponent.active.damage += 40;
    }

    return state;
  }
}
