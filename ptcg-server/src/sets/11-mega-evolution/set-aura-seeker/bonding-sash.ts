import { CardTag, GamePhase, State, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';

export class BondingSash extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Bonding Sash';
  public fullName: string = 'Bonding Sash FLO';
  public text: string = 'If the Mega Evolution Pokémon ex this card is attached to is Knocked Out by damage from an opponent\'s attack, search your deck for a card and put it into your hand. Then, shuffle your deck.';

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
      if (!pokemon || !pokemon.hasTag(CardTag.POKEMON_SV_MEGA)) {
        return state;
      }

      if (player.deck.cards.length > 0) {
        SEARCH_DECK_FOR_CARDS_TO_HAND(
          store,
          state,
          player,
          this,
          {},
          { min: 0, max: 1, allowCancel: false },
        );
      }
    }

    return state;
  }
}
