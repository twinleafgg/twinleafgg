import { DamageMap, PutDamagePrompt } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SpellTag extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'LOT';

  public name: string = 'Spell Tag';

  public fullName: string = 'Spell Tag LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '190';

  public text: string =
    "When the [P] Pokémon this card is attached to is Knocked Out by damage from an opponent's attack, put 4 damage counters on your opponent's Pokémon in any way you like.";

  public damageDealt = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttackEffect && effect.player.active.tools.includes(this)) {
      this.damageDealt = false;
    }

    if (
      (effect instanceof DealDamageEffect || effect instanceof PutDamageEffect) &&
      effect.target.tools.includes(this)
    ) {
      const player = StateUtils.getOpponent(state, effect.player);

      if (player.active.tools.includes(this)) {
        this.damageDealt = true;
      }
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player === StateUtils.getOpponent(state, effect.player)
    ) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (owner === effect.player) {
        this.damageDealt = false;
      }
    }

    if (effect instanceof KnockOutEffect && effect.target.tools.includes(this)) {
      const player = effect.player;

      // const target = effect.target;

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (this.damageDealt) {
        const opponent = StateUtils.getOpponent(state, player);
        const maxAllowedDamage: DamageMap[] = [];
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
          maxAllowedDamage.push({ target, damage: card.hp + 40 });
        });

        return store.prompt(
          state,
          new PutDamagePrompt(
            effect.player.id,
            GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
            PlayerType.TOP_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            40,
            maxAllowedDamage,
            { allowCancel: false },
          ),
          (targets) => {
            const results = targets || [];
            for (const result of results) {
              const target = StateUtils.getTarget(state, player, result.target);

              /*const putCountersEffect = new PutCountersEffect(result.target as unknown as AttackEffect, result.damage);
            putCountersEffect.target = target;
            store.reduceEffect(state, putCountersEffect);*/

              target.damage += result.damage;
            }
          },
        );
      }

      return state;
    }

    return state;
  }
}
