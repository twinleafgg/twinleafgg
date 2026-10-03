import { PlayerType } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class StrengthCharm extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'DF';
  public name: string = 'Strength Charm';
  public fullName: string = 'Strength Charm DF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';

  public text: string =
    'Whenever an attack from the Pokémon that Strength Charm is attached to does damage to the Active Pokémon, this attack does 10 more damage (before applying Weakness and Resistance). Discard Strength Charm at the end of the turn in which this Pokémon attacks.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DealDamageEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.target !== player.active && effect.target !== opponent.active) {
        return state;
      }

      const attack = effect.attack;
      if (attack && attack.damage > 0 && effect.target === opponent.active) {
        effect.damage += 10;

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
          if (cardList.tools && cardList.tools.includes(this)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      }
    }

    return state;
  }
}
