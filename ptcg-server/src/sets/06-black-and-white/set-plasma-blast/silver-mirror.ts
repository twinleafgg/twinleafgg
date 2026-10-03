import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class SilverMirror extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PLB';
  public name: string = 'Silver Mirror';
  public fullName: string = 'Silver Mirror PLB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '89';

  public text: string =
    'Prevent all effects of attacks, including damage, done to the Pokémon this card ' +
    "is attached to (excluding Pokémon-EX) by your opponent's Team Plasma Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AbstractAttackEffect && effect.target.tools.includes(this)) {
      const targetCard = effect.target.getPokemonCard();
      const sourceCard = effect.source.getPokemonCard();

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (
        targetCard &&
        !targetCard.hasTag(CardTag.POKEMON_EX) &&
        sourceCard &&
        sourceCard.hasTag(CardTag.TEAM_PLASMA)
      ) {
        effect.preventDefault = true;
      }
    }

    return state;
  }
}
