import { GamePhase, State, StoreLike } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';

export class FarewellBell extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark: string = 'E';
  public set: string = 'FST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '234';
  public name: string = 'Farewell Bell';
  public fullName: string = 'Farewell Bell FST 234';
  public text: string =
    'If the Pokémon VMAX this card is attached to is Knocked Out by damage from an attack from your opponent\'s Pokémon, search your deck for a card and put it into your hand. Then, shuffle your deck. You may play any number of Item cards during your turn. Attach a Pokémon Tool to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      const player = effect.player;
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      const pokemon = effect.target.getPokemonCard();
      if (!pokemon || !pokemon.hasTag(CardTag.POKEMON_VMAX)) {
        return state;
      }
      if (player.deck.cards.length > 0) {
        SEARCH_DECK_FOR_CARDS_TO_HAND(
          store,
          state,
          player,
          this,
          {},
          { min: 1, max: 1, allowCancel: false },
        );
      }
    }

    return state;
  }
}
