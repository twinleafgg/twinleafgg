import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError, GameMessage, Player, pokemonHasCardType } from '../../../game';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;

  const activePokemon = player.active.getPokemonCard();

  if (activePokemon && !pokemonHasCardType(activePokemon, CardType.DRAGON)) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.active.damage === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Do not discard the card yet
  effect.preventDefault = true;

  const healEffect = new HealEffect(player, player.active, 60);
  store.reduceEffect(state, healEffect);

  MOVE_CARDS(store, state, player.hand, player.discard, { cards: [effect.trainerCard], sourceCard: effect.trainerCard });
  return state;
}

export class DragonsElixir extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'H';

  public set: string = 'SSP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '172';

  public name: string = 'Dragon Elixir';

  public fullName: string = "Dragon's Elixir SSP";

  public text: string = 'Heal 60 damage from your Active Dragon Pokémon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const active = player.active.getPokemonCard();
    if (!active || !pokemonHasCardType(active, CardType.DRAGON) || player.active.damage === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
