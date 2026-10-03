import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
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

  // Player has no Pokemons in the discard pile
  if (!player.discard.cards.some((c) => c.superType === SuperType.POKEMON)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  return store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.discard,
      { superType: SuperType.POKEMON },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      if (selected && selected.length > 0) {
        // Discard trainer only when user selected a Pokemon

        // Recover discarded Pokemon
        MOVE_CARDS(store, state, player.discard, player.hand, {
          cards: selected,
          sourceCard: effect.trainerCard,
        });
      }
    },
  );
}

export class PokemonRescue extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'PL';

  public name: string = 'Pokemon Rescue';

  public fullName: string = 'Pokemon Rescue PL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '115';

  public text: string =
    'Search your discard pile for a Pokemon, show it to your opponent, ' +
    'and put it into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
