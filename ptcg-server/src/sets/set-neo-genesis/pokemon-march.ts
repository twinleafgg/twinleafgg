import {
  Player,
  StoreLike,
  State,
  PokemonCardList,
  ChooseCardsPrompt,
  GameMessage,
  SuperType,
  Stage,
  PokemonCard,
  TrainerCard,
  TrainerType,
  StateUtils,
  GameError,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../game/store/effects/play-card-effects';
import {
  GET_PLAYER_BENCH_SLOTS,
  CONFIRMATION_PROMPT,
  SHUFFLE_DECK,
} from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';

function canSearchBasicToBench(player: Player): boolean {
  return GET_PLAYER_BENCH_SLOTS(player).length > 0 && player.deck.cards.length > 0;
}

function maybeSearchBasicToBench(
  store: StoreLike,
  state: State,
  player: Player,
  onComplete: () => void,
): void {
  if (!canSearchBasicToBench(player)) {
    onComplete();
    return;
  }

  CONFIRMATION_PROMPT(store, state, player, (result) => {
    if (!result) {
      onComplete();
      return;
    }

    const slots: PokemonCardList[] = GET_PLAYER_BENCH_SLOTS(player);
    store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.deck,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: 1, allowCancel: false },
      ),
      (selected) => {
        const cards = selected || [];
        cards.forEach((card, index) => {
          store.reduceEffect(
            state,
            new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
          );
        });
        onComplete();
      },
    );
  });
}

export class PokemonMarch extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'N1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '102';
  public name: string = 'Pokémon March';
  public fullName: string = 'Pokémon March N1';
  public text: string =
    "Your opponent may search his or her deck for 1 Basic Pokémon card and put it onto his or her Bench. Then, you may search your deck for 1 Basic Pokémon card and put it onto your Bench. Then, each player shuffles his or her deck. (A player can't do any of this if his or her Bench is full.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (!canSearchBasicToBench(player) && !canSearchBasicToBench(opponent)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Opponent may search first, then you may search, then each player shuffles
      maybeSearchBasicToBench(store, state, opponent, () => {
        maybeSearchBasicToBench(store, state, player, () => {
          SHUFFLE_DECK(store, state, opponent);
          SHUFFLE_DECK(store, state, player);
        });
      });
    }

    return state;
  }
}
