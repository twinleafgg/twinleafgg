import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class ElectricMemory extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'UPR';
  public setNumber: string = '121';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Electric Memory';
  public fullName: string = 'Electric Memory UPR';
  public text: string = 'The Silvally-GX this card is attached to is a Lightning Pokémon.';

  // Ref: set-crimson-invasion/psychic-memory.ts (Psychic Memory - CheckPokemonTypeEffect tool)
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonTypeEffect) {
      // Check if this tool is attached to the target Pokemon
      if (!effect.target.tools.includes(this)) {
        return state;
      }

      // Check if it's attached to Silvally-GX
      const pokemonCard = effect.target.getPokemonCard();
      if (!pokemonCard || pokemonCard.name !== 'Silvally-GX') {
        return state;
      }

      const player = StateUtils.findOwner(state, effect.target);
      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Replace the type with Lightning
      effect.cardTypes = [CardType.LIGHTNING];
    }

    return state;
  }
}
