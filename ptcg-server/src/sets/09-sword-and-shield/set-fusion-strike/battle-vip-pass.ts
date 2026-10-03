import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  GameError,
  ShuffleDeckPrompt,
  PokemonCard,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  PlayPokemonFromDeckEffect,
  TrainerEffect,
} from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BattleVIPPass extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'FST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '225';
  public regulationMark = 'E';
  public name: string = 'Battle VIP Pass';
  public fullName: string = 'Battle VIP Pass FST';

  public text: string = `You can use this card only during your first turn.

Search your deck for up to 2 Basic Pokémon and put them onto your Bench. Then, shuffle your deck.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const turn = state.turn;

      if (turn > 2) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const player = effect.player;
      const openSlots = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0 || openSlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const maxCards = Math.min(2, openSlots.length);

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
          const cards = selectedCards || [];

          cards.forEach((card, index) => {
            const playPokemonFromDeckEffect = new PlayPokemonFromDeckEffect(
              player,
              card as PokemonCard,
              openSlots[index],
            );
            store.reduceEffect(state, playPokemonFromDeckEffect);
          });

          MOVE_CARDS(store, state, player.supporter, player.discard, {
            cards: [this],
            sourceCard: this,
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            return state;
          });
        },
      );
    }
    return state;
  }
}
