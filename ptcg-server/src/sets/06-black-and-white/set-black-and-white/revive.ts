import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

  // Player has no empty bench slot
  if (slots.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Player has no basic Pokemons in the discard pile
  if (!player.discard.cards.some((c) => c instanceof PokemonCard && c.stage === Stage.BASIC)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: effect.trainerCard });

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
      player.discard,
      { superType: SuperType.POKEMON, stage: Stage.BASIC },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      if (selected && selected.length > 0) {
        // Discard trainer only when user selected a Pokemon
        // Recover discarded Pokemon
        state = MOVE_CARDS(store, state, player.discard, slots[0], {
          cards: selected,
          sourceCard: effect.trainerCard,
        });
      }
    },
  );
}

export class Revive extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BLW';

  public name: string = 'Revive';

  public fullName: string = 'Revive BLW';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '102';

  public text: string = 'Put a Basic Pokemon from your discard pile onto your Bench.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
