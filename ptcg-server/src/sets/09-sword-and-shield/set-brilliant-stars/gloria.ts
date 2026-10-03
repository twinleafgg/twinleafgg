import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PokemonCard,
  PokemonCardList,
  ShuffleDeckPrompt,
  State,
  StoreLike,
} from '../../../game';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  PlayPokemonFromDeckEffect,
  TrainerEffect,
} from '../../../game/store/effects/play-card-effects';
export class Gloria extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '141';
  public regulationMark = 'E';
  public name: string = 'Gloria';
  public fullName: string = 'Gloria BRS';

  public text: string =
    "Search your deck for up to 3 Basic Pokémon that don't have a Rule Box and put them onto your Bench. Then, shuffle your deck. (Pokémon V, Pokémon-GX, etc. have Rule Boxes.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Allow player to search deck and choose up to 2 Basic Pokemon
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      } else {
        // Check if bench has open slots
        const openSlots = player.bench.filter((b) => b.cards.length === 0);

        if (openSlots.length === 0) {
          // No open slots, throw error
          throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
        }

        const blocked: number[] = [];
        player.deck.cards.forEach((c, index) => {
          if (!(c instanceof PokemonCard) || c.stage !== Stage.BASIC || c.hasRuleBox()) {
            blocked.push(index);
          }
        });

        MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
        // We will discard this card after prompt confirmation
        effect.preventDefault = true;

        let cards: Card[] = [];

        const maxCards = Math.min(3, openSlots.length);

        return store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
            player.deck,
            { superType: SuperType.POKEMON, stage: Stage.BASIC },
            { min: 0, max: maxCards, allowCancel: false, blocked: blocked },
          ),
          (selectedCards) => {
            cards = selectedCards || [];

            cards.forEach((card, index) => {
              store.reduceEffect(
                state,
                new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
              );
            });

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          },
        );
      }
    }

    return state;
  }
}
