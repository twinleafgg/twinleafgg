import { GameError, PokemonCard, SelectPrompt } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PokemonRetriever extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'TRR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '84';

  public name: string = 'Pokémon Retriever';

  public fullName: string = 'Pokémon Retriever TRR';

  public text: string =
    'Search your discard pile for Basic Pokémon and Evolution cards. You may either show 1 Basic Pokémon or Evolution card to your opponent and put it into your hand, or show a combination of 3 Basic Pokémon or Evolution cards to your opponent and shuffle them into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      let pokemonInDiscard: number = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        const isPokemon = c instanceof PokemonCard;
        if (isPokemon) {
          pokemonInDiscard += 1;
        } else {
          blocked.push(index);
        }
      });

      // Player does not have correct cards in discard
      if (pokemonInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.CHOOSE_CARD_TO_DECK,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DECK,
                player.discard,
                { superType: SuperType.POKEMON },
                { min: Math.min(pokemonInDiscard, 3), max: 3, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];

                MOVE_CARDS(store, state, player.discard, player.deck, {
                  cards: cards,
                  sourceCard: this,
                });

                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              },
            );
          },
        },
        {
          message: GameMessage.CHOOSE_CARD_TO_HAND,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.POKEMON },
                { min: 1, max: 1, allowCancel: false, blocked },
              ),
              (selected) => {
                cards = selected || [];

                MOVE_CARDS(store, state, player.discard, player.hand, {
                  cards: cards,
                  sourceCard: this,
                });

                return state;
              },
            );
          },
        },
      ];

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }
    return state;
  }
}
