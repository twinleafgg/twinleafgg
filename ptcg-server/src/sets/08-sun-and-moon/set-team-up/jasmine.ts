import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, PokemonCard, StateUtils, pokemonHasCardType } from '../../../game';
import {
  MOVE_CARDS_TO_HAND,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class Jasmine extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'TEU';
  public name: string = 'Jasmine';
  public fullName: string = 'Jasmine TEU';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '145';

  public text: string =
    "Search your deck for a [M] Pokémon, reveal it, and put it into your hand. If you go second and it's your first turn, search for 5 [M] Pokémon instead of 1. Then, shuffle your deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const numPokemon = state.turn <= 2 ? 5 : 1;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard && pokemonHasCardType(card, CardType.METAL))) {
          blocked.push(index);
        }
      });

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: numPokemon, allowCancel: true, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length === 0) {
            return state;
          }

          MOVE_CARDS_TO_HAND(store, state, player, cards);
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

          SHUFFLE_DECK(store, state, player);
        },
      );

      return state;
    }
    return state;
  }
}
