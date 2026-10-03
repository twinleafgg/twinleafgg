import {
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  GameStoreMessage,
  PlayerType,
  SlotType,
  TrainerCard,
  Player,
} from '../../../game';
import { CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DEVOLVE_POKEMON } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class StrangeTimepiece extends TrainerCard {
  public name = 'Strange Timepiece';
  public cardImage: string = 'assets/cardback.png';
  public setNumber = '128';
  public set = 'MEG';
  public regulationMark = 'I';
  public fullName = 'Strange Timepiece MEG';
  public superType = SuperType.TRAINER;
  protected _trainerType = TrainerType.ITEM;

  public text =
    "Devolve 1 of your evolved [P] Pokémon by putting any number of Evolution cards on it into your hand. (That Pokémon can't evolve this turn.)";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    let canDevolve = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list) => {
      const checkTypeEffect = new CheckPokemonTypeEffect(list);
      store.reduceEffect(state, checkTypeEffect);
      if (list.isEvolved() && checkTypeEffect.cardTypes.includes(CardType.PSYCHIC)) {
        canDevolve = true;
      }
    });
    if (!canDevolve) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      let canDevolve = false;

      const blocked: CardTarget[] = [];
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        const checkTypeEffect = new CheckPokemonTypeEffect(list);
        store.reduceEffect(state, checkTypeEffect);
        if (list.isEvolved() && checkTypeEffect.cardTypes.includes(CardType.PSYCHIC)) {
          canDevolve = true;
        } else {
          blocked.push(target);
        }
      });

      if (!canDevolve) {
        throw new GameError(GameStoreMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Choose Pokemon to Devolve
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          effect.player.id,
          GameMessage.CHOOSE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, min: 1, max: 1, blocked },
        ),
        (results) => {
          if (results && results.length > 0 && results[0].getPokemons().length > 0) {
            // Choose how far to devolve
            store.prompt(
              state,
              new ChooseCardsPrompt(
                effect.player,
                GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
                results[0],
                { superType: SuperType.POKEMON },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                if (selected && selected.length > 0) {
                  const pokemons = results[0].getPokemons();
                  const selectedPokemon = selected[0] as PokemonCard;
                  const selectedIndex = pokemons.findIndex((p) => p === selectedPokemon);

                  if (selectedIndex === 0) {
                    throw new GameError(GameMessage.INVALID_PROMPT_RESULT);
                  }

                  if (selectedIndex >= 0) {
                    // Devolve until the selected Pokemon and everything above it is in hand
                    // We need to devolve (pokemons.length - selectedIndex) times
                    const devolvesNeeded = pokemons.length - selectedIndex;
                    for (let i = 0; i < devolvesNeeded; i++) {
                      DEVOLVE_POKEMON(store, state, results[0], effect.player.hand);
                    }
                  }

                  return state;
                }
              },
            );
          }
          return state;
        },
      );
    }

    return state;
  }
}
