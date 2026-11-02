import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameError, GameMessage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function* playCard(_next: Function, store: StoreLike, state: State, effect: TrainerEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  if (!player.discard.cards.some(c => c.superType === SuperType.POKEMON)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  effect.preventDefault = true;

  return store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.discard,
    { superType: SuperType.POKEMON },
    { min: 1, max: 1, allowCancel: true }
  ), selected => {
    if (selected && selected.length > 0) {
      SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
      MOVE_CARDS(store, state, player.discard, player.hand, {
        cards: selected,
        sourceCard: effect.trainerCard
      });
    }
  });
}

export class PokemonRescue extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '115';
  public name: string = 'Pokemon Rescue';
  public fullName: string = 'Pokemon Rescue PL';
  public text: string = 'Search your discard pile for a Pokemon, show it to your opponent, and put it into your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
