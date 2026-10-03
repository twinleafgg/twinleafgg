import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { StateUtils, StoreLike, State, Player } from '../../../game';
import {
  ADD_MARKER,
  DRAW_CARDS,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHOW_CARDS_TO_PLAYER,
} from '../../../game/store/prefabs/prefabs';

export const EMMA_PLAYED_THIS_TURN = 'EMMA_PLAYED_THIS_TURN';

export class Emma extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = 'Emma';
  public fullName: string = 'Emma M4';
  public text: string =
    'Your opponent reveals their hand, and you draw a card for each Pokémon you find there.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
      const pokemonCount = opponent.hand.cards.filter((c) => c instanceof PokemonCard).length;
      DRAW_CARDS(store, state, player, pokemonCount);
      ADD_MARKER(EMMA_PLAYED_THIS_TURN, player, this);
      REMOVE_MARKER_AT_END_OF_TURN(effect, EMMA_PLAYED_THIS_TURN, this);
    }
    return state;
  }
}
