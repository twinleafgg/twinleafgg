import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameMessage } from '../../../game/game-message';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { StateUtils } from '../../../game/store/state-utils';
import { GameError, PokemonCardList } from '../../../game';
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

  // Must have another Cross Switcher in hand besides this one
  const second = player.hand.cards.find((c) => {
    return c.name === name && c !== effect.trainerCard;
  });
  if (second === undefined) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Check if opponent has any benched Pokemon
  const benchCount = opponent.bench.some((b) => b.cards.length > 0);
  if (!benchCount) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We already verified second exists; discard both at the end

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

      // Check if player has any benched Pokemon
      const hasBench = player.bench.some((b) => b.cards.length > 0);
      if (!hasBench) {
        // No bench for player: discard both Cross Switchers now and finish
        if (second !== undefined) {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: [second], sourceCard: effect.trainerCard });
        }

        return state;
      }

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

          // Perform player's switch, then discard both Cross Switchers
          player.active.clearEffects();
          player.switchPokemon(target[0]);

          if (second !== undefined) {
            MOVE_CARDS(store, state, player.hand, player.discard, { cards: [second], sourceCard: effect.trainerCard });
          }

          return state;
        },
      );
    },
  );
}

export class CrossSwitcher extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.FUSION_STRIKE];
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '230';
  public set: string = 'FST';
  public name: string = 'Cross Switcher';
  public fullName: string = 'Cross Switcher FST';

  public text: string = `You must play 2 Cross Switcher cards at once. (This effect works one time for 2 cards.)

Switch 1 of your opponent's Benched Pokémon with their Active Pokémon. If you do, switch your Active Pokémon with 1 of your Benched Pokémon.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
