import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PlayerType, SlotType, GameError, GameMessage, PokemonCardList } from '../../../game';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const hasBench = player.bench.some((b) => b.cards.length > 0);

  if (hasBench === false) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // Do not discard the card yet
  effect.preventDefault = true;
  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });

  const pokemonCard = player.active.getPokemonCard();

  if (pokemonCard && pokemonCard.stage !== Stage.BASIC) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (pokemonCard && pokemonCard.stage === Stage.BASIC) {
    let targets: PokemonCardList[] = [];
    yield store.prompt(
      state,
      new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false },
      ),
      (results) => {
        targets = results || [];
        next();
      },
    );

    if (targets.length === 0) {
      return state;
    }

    // Discard trainer only when user selected a Pokemon
    const healEffect = new HealEffect(player, player.active, 30);
    store.reduceEffect(state, healEffect);
    player.active.clearEffects();
    player.switchPokemon(targets[0]);
    return state;
  }
  return state;
}
export class SwitchCart extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public regulationMark = 'F';

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '154';

  public name: string = 'Switch Cart';

  public fullName: string = 'Switch Cart ASR';

  public text: string =
    'Switch your Active Basic Pokémon with 1 of your Benched Pokémon. If you do, heal 30 damage from the Pokémon you moved to your Bench.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
