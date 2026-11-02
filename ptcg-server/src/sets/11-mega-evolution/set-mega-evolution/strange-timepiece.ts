import { TrainerCard, SuperType, TrainerType, StoreLike, State, Player, PlayerType, CardTarget, GameError, GameStoreMessage, ChoosePokemonPrompt, GameMessage, SlotType, PokemonCardList, CardType, Stage, ChooseCardsPrompt, PokemonCard } from "../../../game";
import { CheckPokemonTypeEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { DEVOLVE_POKEMON } from "../../../game/store/prefabs/prefabs";
import { WAS_TRAINER_USED } from "../../../game/store/prefabs/trainer-prefabs";

export class StrangeTimepiece extends TrainerCard {
  public name = 'Strange Timepiece';
  public cardImage: string = 'assets/cardback.png';
  public setNumber = '128';
  public set = 'MEG';
  public regulationMark = 'I';
  public fullName = 'Strange Timepiece MEG';
  public superType = SuperType.TRAINER;
  protected _trainerType = TrainerType.ITEM;
  public text = "Devolve 1 of your evolved [P] Pokémon by putting any number of Evolution cards on it into your hand. (That Pokémon can't evolve this turn.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    let canDevolve = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list) => {
      if (this.isDevolvable(store, state, list)) {
        canDevolve = true;
      }
    });
    return canDevolve;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (!WAS_TRAINER_USED(effect, this)) {
      return state;
    }

    const blocked: CardTarget[] = [];
    let canDevolve = false;
    effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
      if (this.isDevolvable(store, state, list)) {
        canDevolve = true;
      } else {
        blocked.push(target);
      }
    });

    if (!canDevolve) {
      throw new GameError(GameStoreMessage.CANNOT_PLAY_THIS_CARD);
    }

    const choosePokemon = new ChoosePokemonPrompt(
      effect.player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { allowCancel: false, min: 1, max: 1, blocked },
    );

    return store.prompt(state, choosePokemon, (results) => {
      const chosen = results && results.length > 0 ? results[0] : undefined;
      if (!chosen || chosen.getPokemons().length === 0) {
        return state;
      }
      return this.chooseDevolveDepth(store, state, effect.player, chosen);
    });
  }

  private isDevolvable(store: StoreLike, state: State, list: PokemonCardList): boolean {
    const checkTypeEffect = new CheckPokemonTypeEffect(list);
    store.reduceEffect(state, checkTypeEffect);
    return list.isEvolved() && checkTypeEffect.cardTypes.includes(CardType.PSYCHIC);
  }

  private chooseDevolveDepth(
    store: StoreLike,
    state: State,
    player: Player,
    chosen: PokemonCardList,
  ): State {
    const pokemons = chosen.getPokemons();

    // Only Evolution cards can be put into hand, so the Basic Pokemon
    // (always the bottom card) must not be selectable.
    const blocked: number[] = [];
    pokemons.forEach((pokemon, index) => {
      if (index === 0 || pokemon.stage === Stage.BASIC) {
        blocked.push(index);
      }
    });

    const chooseCards = new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
      chosen,
      { superType: SuperType.POKEMON },
      { min: 1, max: 1, allowCancel: false, blocked },
    );

    return store.prompt(state, chooseCards, (selected) => {
      const selectedPokemon = selected && selected.length > 0 ? selected[0] as PokemonCard : undefined;
      if (!selectedPokemon) {
        return state;
      }

      const selectedIndex = pokemons.findIndex((p) => p === selectedPokemon);
      if (selectedIndex <= 0) {
        throw new GameError(GameMessage.INVALID_PROMPT_RESULT);
      }

      // Devolve the selected Pokemon and every Evolution above it.
      const devolvesNeeded = pokemons.length - selectedIndex;
      for (let i = 0; i < devolvesNeeded; i++) {
        DEVOLVE_POKEMON(store, state, chosen, player.hand);
      }
      return state;
    });
  }
}
