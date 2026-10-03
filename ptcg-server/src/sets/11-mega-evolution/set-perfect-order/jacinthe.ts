import {
  TrainerCard,
  TrainerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  PlayerType,
  CardType,
  ChoosePokemonPrompt,
  SlotType,
  Player,
  pokemonHasCardType,
} from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Jacinthe extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '75';
  public name: string = 'Jacinthe';
  public fullName: string = 'Jacinthe M3';
  public text: string = 'Heal 150 damage from 1 of your [P] Pokemon.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean | undefined {
    if (player.supporterTurn > 0) {
      return false;
    }

    // Check if any Psychic Pokemon have damage
    let hasDamagedPsychicPokemon = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const pokemonCard = cardList.getPokemonCard();
      if (pokemonCard && pokemonHasCardType(pokemonCard, CardType.PSYCHIC) && cardList.damage > 0) {
        hasDamagedPsychicPokemon = true;
      }
    });

    if (!hasDamagedPsychicPokemon) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Find Psychic Pokemon
      const psychicPokemon: any[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard) {
          const checkType = new CheckPokemonTypeEffect(cardList);
          store.reduceEffect(state, checkType);
          if (checkType.cardTypes.includes(CardType.PSYCHIC)) {
            psychicPokemon.push(cardList);
          }
        }
      });

      if (psychicPokemon.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check if any Psychic Pokemon have damage
      let hasDamagedPsychicPokemon = false;
      for (const cardList of psychicPokemon) {
        if (cardList.damage > 0) {
          hasDamagedPsychicPokemon = true;
          break;
        }
      }

      if (!hasDamagedPsychicPokemon) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          if (targets.length > 0) {
            const target = targets[0];
            // Verify it's a Psychic Pokemon
            const checkType = new CheckPokemonTypeEffect(target);
            store.reduceEffect(state, checkType);
            if (checkType.cardTypes.includes(CardType.PSYCHIC)) {
              const healEffect = new HealEffect(player, target, 150);
              store.reduceEffect(state, healEffect);
            }
          }
        },
      );
    }

    return state;
  }
}
