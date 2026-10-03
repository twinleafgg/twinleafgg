import {
  TrainerCard,
  TrainerType,
  StoreLike,
  State,
  StateUtils,
  ChooseCardsPrompt,
  GameMessage,
  GameError,
  EnergyCard,
  EnergyType,
  PokemonCard,
  Stage,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  BLOCK_IF_DECK_EMPTY,
  SHOW_CARDS_TO_PLAYER,
  MOVE_CARD_TO,
  SHUFFLE_DECK,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class RoseannesResearch extends TrainerCard {
  protected _trainerType = TrainerType.SUPPORTER;
  public cardImage: string = 'assets/cardback.png';
  public set = 'SW';
  public setNumber: string = '125';
  public name = "Roseanne's Research";
  public fullName = "Roseanne's Research SW";

  public text =
    'Search your deck for up to 2 in any combination of Basic Pokémon and basic Energy cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [this], sourceCard: this });
      BLOCK_IF_DECK_EMPTY(player);

      const blocked: number[] = [];
      player.deck.cards.forEach((c, index) => {
        const isBasicEnergy = c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
        const isBasicPokemon = c instanceof PokemonCard && c.stage === Stage.BASIC;
        if (!(isBasicEnergy || isBasicPokemon)) {
          blocked.push(index);
        }
      });

      effect.preventDefault = true;

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.deck,
          {},
          { min: 0, max: 2, allowCancel: false, blocked },
        ),
        (cards) => {
          if (!cards || cards.length === 0) {
            return state;
          }

          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          cards.forEach((card) => MOVE_CARD_TO(state, card, player.hand));
          SHUFFLE_DECK(store, state, player);
        },
      );

      MOVE_CARDS(store, state, player.supporter, player.discard, {
        cards: [this],
        sourceCard: this,
      });
    }

    return state;
  }
}
