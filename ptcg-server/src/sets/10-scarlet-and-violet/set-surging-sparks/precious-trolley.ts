import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  PokemonCardList,
  ShuffleDeckPrompt,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  PlayPokemonFromDeckEffect,
  TrainerEffect,
} from '../../../game/store/effects/play-card-effects';

export class PreciousTrolley extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.ACE_SPEC];
  public set: string = 'SSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '185';
  public regulationMark = 'H';
  public name: string = 'Precious Trolley';
  public fullName: string = 'Precious Trolley SSP';

  public text: string =
    'Search your deck for any number of Basic Pokémon and put them onto your Bench. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    const openSlots = player.bench.filter((b) => b.cards.length === 0);
    if (openSlots.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      // Allow player to search deck and choose up to 2 Basic Pokemon
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      // Check if bench has open slots
      const openSlots = player.bench.filter((b) => b.cards.length === 0);

      if (openSlots.length === 0) {
        // No open slots, throw error
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const maxCards = Math.min(openSlots.length, openSlots.length);

      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.deck,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: maxCards, allowCancel: false },
        ),
        (selectedCards) => {
          cards = selectedCards || [];

          // Use the new PlayPokemonFromDeckEffect for each selected card
          cards.forEach((card, index) => {
            const playPokemonFromDeckEffect = new PlayPokemonFromDeckEffect(
              player,
              card as any,
              slots[index],
            );
            store.reduceEffect(state, playPokemonFromDeckEffect);
          });

          MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [this], sourceCard: this });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }
    return state;
  }
}
