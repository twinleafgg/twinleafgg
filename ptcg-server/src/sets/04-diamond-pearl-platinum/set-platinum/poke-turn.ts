import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { CardTarget, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function* playCard(_next: Function, store: StoreLike, state: State, effect: TrainerEffect): IterableIterator<State> {
  const player = effect.player;
  const blocked: CardTarget[] = [];
  let hasPokemonSp = false;

  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card, target) => {
    const isPokemonSp = card.hasTag(CardTag.POKEMON_SP);
    hasPokemonSp = hasPokemonSp || isPokemonSp;
    if (!isPokemonSp) {
      blocked.push(target);
    }
  });

  if (!hasPokemonSp) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  effect.preventDefault = true;

  return store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { allowCancel: true, blocked }
  ), targets => {
    if (targets && targets.length > 0) {
      MOVE_POKEMON_OFF_BOARD(store, state, targets[0], {
        pokemonDestination: player.hand,
        sourceCard: effect.trainerCard
      });
    }
  });
}

export class PokeTurn extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '118';
  public name: string = 'Team Galactic\'s Invention G-105 Poke Turn';
  public fullName: string = 'Poke Turn PL';
  public text: string = 'Return 1 of your Pokemon SP and all cards attached to it to your hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
