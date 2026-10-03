import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, Stage, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { BLOCK_IF_DECK_EMPTY,
  BLOCK_IF_NO_SLOTS,
  GET_PLAYER_BENCH_SLOTS,
  SHUFFLE_DECK,  MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt, PokemonCard } from '../../../game';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';

export class Archie extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MA';
  public name: string = 'Archie';
  public fullName: string = 'Archie MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';

  public text: string =
    'Search your deck for a Pokémon with Team Aqua in its name and put it onto your Bench. Shuffle your deck afterward. Treat the new Benched Pokémon as a Basic Pokémon. If it is a Stage 2 Pokémon, put 2 damage counters on that Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      BLOCK_IF_DECK_EMPTY(player);
      const slots = GET_PLAYER_BENCH_SLOTS(player);
      BLOCK_IF_NO_SLOTS(slots);

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hasTag(CardTag.TEAM_AQUA)) {
          return;
        } else {
          blocked.push(index);
        }
      });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          cards.forEach((card, index) => {
            store.reduceEffect(
              state,
              new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
            );

            if (slots[index].getPokemonCard()?.stage === Stage.STAGE_2) {
              slots[index].damage += 20; // Add 2 damage counters
            }
          });
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}
