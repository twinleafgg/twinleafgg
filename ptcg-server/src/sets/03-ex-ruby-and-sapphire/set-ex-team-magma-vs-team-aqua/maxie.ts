import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, Stage, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { BLOCK_IF_NO_SLOTS, GET_PLAYER_BENCH_SLOTS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt, PokemonCard, SelectOptionPrompt } from '../../../game';

export class Maxie extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MA';
  public name: string = 'Maxie';
  public fullName: string = 'Maxie MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';

  public text: string =
    'Search your hand or discard pile for a Pokémon with Team Magma in its name and put it onto your Bench. Treat the new Benched Pokémon as a Basic Pokémon. If it is a Stage 2 Pokémon, put 2 damage counters on that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const slots = GET_PLAYER_BENCH_SLOTS(player);
      BLOCK_IF_NO_SLOTS(slots);

      const blockedHand: number[] = [];
      let hasTeamMagmaInHand = false;
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hasTag(CardTag.TEAM_MAGMA)) {
          hasTeamMagmaInHand = true;
        } else {
          blockedHand.push(index);
        }
      });

      const blockedDiscard: number[] = [];
      let hasTeamMagmaInDiscard = false;
      player.discard.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hasTag(CardTag.TEAM_MAGMA)) {
          hasTeamMagmaInDiscard = true;
        } else {
          blockedDiscard.push(index);
        }
      });
      // Error if no targets
      if (!hasTeamMagmaInHand && !hasTeamMagmaInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const options: { message: GameMessage; action: () => void }[] = [];
      // Add possible options
      if (hasTeamMagmaInHand) {
        options.push({
          message: GameMessage.CHOOSE_CARD_TO_HAND,
          action: () => {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                player.hand,
                { superType: SuperType.POKEMON },
                { min: 1, max: 1, allowCancel: false, blocked: blockedHand },
              ),
              (selected) => {
                const cards = selected || [];
                cards.forEach((card, index) => {
                  MOVE_CARDS(store, state, player.hand, slots[index], { cards: [card], sourceCard: this });
                  slots[index].pokemonPlayedTurn = state.turn;

                  if (slots[index].getPokemonCard()?.stage === Stage.STAGE_2) {
                    slots[index].damage += 20; // Add 2 damage counters
                  }
                });
              },
            );
          },
        });
      }
      // If there are cards in discard, add option to choose from there
      if (hasTeamMagmaInDiscard) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DISCARD,
          action: () => {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                player.discard,
                { superType: SuperType.POKEMON },
                { min: 1, max: 1, allowCancel: false, blocked: blockedDiscard },
              ),
              (selected) => {
                const cards = selected || [];
                cards.forEach((card, index) => {
                  MOVE_CARDS(store, state, player.discard, slots[index], { cards: [card], sourceCard: this });
                  slots[index].pokemonPlayedTurn = state.turn;

                  if (slots[index].getPokemonCard()?.stage === Stage.STAGE_2) {
                    slots[index].damage += 20; // Add 2 damage counters
                  }
                });
              },
            );
          },
        });
      }

      // If only one option, execute it immediately
      if (options.length === 1) {
        options[0].action();
      } else {
        // If multiple options, prompt the player to choose
        store.prompt(
          state,
          new SelectOptionPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            [
              'Choose a Team Magma Pokémon from your hand to put onto your Bench',
              'Choose a Team Magma Pokémon from your discard pile to put onto your Bench',
            ],
            {
              allowCancel: true,
            },
          ),
          (choice) => {
            const option = options[choice];
            option.action();
          },
        );
      }
    }

    return state;
  }
}
