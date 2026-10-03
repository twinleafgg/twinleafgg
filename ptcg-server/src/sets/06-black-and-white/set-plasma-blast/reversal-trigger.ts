import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {
  IS_TOOL_BLOCKED,
  SEARCH_DECK_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';

export class ReversalTrigger extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLB';
  public setNumber: string = '86';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Reversal Trigger';
  public fullName: string = 'Reversal Trigger PLB';
  public text: string =
    "When the Team Plasma Pokémon this card is attached to is Knocked Out by damage from an opponent's attack, search your deck for a card and put it into your hand. Shuffle your deck afterward.";

  public damageDealt = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reset damage flag at the start of each attack
    if (effect instanceof AttackEffect) {
      this.damageDealt = false;
    }

    // Track if damage was dealt to the attached Pokemon
    if (
      (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) &&
      effect.target.tools.includes(this)
    ) {
      const player = StateUtils.findOwner(state, effect.target);

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Only works on Team Plasma Pokemon
      const pokemon = effect.target.getPokemonCard();
      if (pokemon && pokemon.hasTag(CardTag.TEAM_PLASMA)) {
        this.damageDealt = true;
      }
    }

    // When KO'd by damage from attack, search deck for any card
    if (
      effect instanceof KnockOutEffect &&
      effect.target.tools.includes(this) &&
      this.damageDealt
    ) {
      const toolOwner = StateUtils.findOwner(state, effect.target);

      // Only works on Team Plasma Pokemon
      const pokemon = effect.target.getPokemonCard();
      if (pokemon && pokemon.hasTag(CardTag.TEAM_PLASMA)) {
        this.damageDealt = false;

        if (toolOwner.deck.cards.length > 0) {
          SEARCH_DECK_FOR_CARDS_TO_HAND(
            store,
            state,
            toolOwner,
            this,
            {},
            { min: 1, max: 1, allowCancel: false },
          );
        }
      }
    }

    return state;
  }
}
