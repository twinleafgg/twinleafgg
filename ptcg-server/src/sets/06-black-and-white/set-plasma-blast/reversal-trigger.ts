import { GamePhase, State, StoreLike } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { IS_TOOL_BLOCKED, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';

export class ReversalTrigger extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLB';
  public setNumber: string = '86';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Reversal Trigger';
  public fullName: string = 'Reversal Trigger PLB';
  public text: string =
    'When the Team Plasma Pokémon this card is attached to is Knocked Out by damage from an opponent\'s attack, search your deck for a card and put it into your hand. Shuffle your deck afterward.';

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
      if (!pokemon || !pokemon.hasTag(CardTag.TEAM_PLASMA)) {
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
