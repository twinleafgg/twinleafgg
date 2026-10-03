import { Card, GameError, GameMessage, PokemonCard, Stage, StoreLike, SuperType } from '../../game';
import { TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { State } from '../../game/store/state/state';

export class Revive extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BS'; // Replace with the appropriate set abbreviation

  public name: string = 'Revive';

  public fullName: string = 'Revive BS'; // Replace with the appropriate set abbreviation

  public cardImage: string = 'assets/cardback.png'; // Replace with the appropriate card image path

  public setNumber: string = '89'; // Replace with the appropriate set number

  public text: string =
    "Put 1 Basic Pokémon card from your discard pile onto your Bench. Put damage counters on that Pokémon equal to half its HP (rounded down to the nearest 10). (You can't play Revive if your Bench is full.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if player's bench is full
      const openSlots = player.bench.filter((b) => b.cards.length === 0);

      if (openSlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 1, max: 1, allowCancel: true },
        ),
        (selected) => {
          cards = selected || [];
          if (cards.length > 0) {
            const card = cards[0];
            const slot = openSlots[0];

            const pokemonCard = card as PokemonCard;
            const damage = Math.floor(pokemonCard.hp / 2 / 10) * 10;

            MOVE_CARDS(store, state, player.discard, slot, { cards: [card], sourceCard: this });

            slot.damage = damage;
            slot.pokemonPlayedTurn = state.turn;

            return state;
          }
        },
      );
    }

    return state;
  }
}
