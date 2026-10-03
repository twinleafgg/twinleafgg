import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class SilverBangle extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'PLB';

  public name: string = 'Silver Bangle';

  public fullName: string = 'Silver Bangle PLB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '88';

  public text: string =
    'The attacks of the Pokemon this card is attached to (excluding ' +
    'Pokemon-EX) do 30 more damage to Active Pokemon-EX (before applying ' +
    'Weakness and Resistance).';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.source.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.target !== player.active && effect.target !== opponent.active) {
        return state;
      }

      const pokemonCard = effect.source.getPokemonCard();
      if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_EX)) {
        return state;
      }

      const targetCard = effect.target.getPokemonCard();
      if (targetCard && targetCard.hasTag(CardTag.POKEMON_EX)) {
        effect.damage += 30;
      }
    }

    return state;
  }
}
