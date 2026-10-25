import { DamageMap, GamePhase, PutDamagePrompt } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
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
    'When the [P] Pokémon this card is attached to is Knocked Out by damage from an opponent\'s attack, put 4 damage counters on your opponent\'s Pokémon in any way you like.';

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

      const opponent = StateUtils.getOpponent(state, player);
      const maxAllowedDamage: DamageMap[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        maxAllowedDamage.push({ target, damage: card.hp + 40 });
      });

      return store.prompt(
        state,
        new PutDamagePrompt(
          player.id,
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
            target.damage += result.damage;
          }
        },
      );
    }

    return state;
  }
}
