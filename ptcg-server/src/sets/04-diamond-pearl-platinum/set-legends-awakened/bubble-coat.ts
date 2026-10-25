import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { PlayerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { ADD_MARKER } from '../../../game/store/prefabs/prefabs';
import { HAS_MARKER } from '../../../game/store/prefabs/prefabs';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER } from '../../../game/store/prefabs/prefabs';

export class BubbleCoat extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '129';
  public name: string = 'Bubble Coat';
  public fullName: string = 'Bubble Coat LA';
  public text: string = 'Attach Bubble Coat to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. As long as Bubble Coat is attached to a Pokémon, that Pokémon has no Weakness. If that Pokémon is damaged by an opponent\'s attack, discard this card at the end of the turn.';

  public readonly DAMAGED_MARKER = 'BUBBLE_COAT_DAMAGED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonStatsEffect && effect.target.tools.includes(this)) {
      const owner = state.players.find(p => p.active === effect.target || p.bench.includes(effect.target));
      if (owner && !IS_TOOL_BLOCKED(store, state, owner, this)) {
        effect.weakness = [];
      }
    }

    if (effect instanceof AfterDamageEffect && effect.target.tools.includes(this) && effect.damage > 0) {
      ADD_MARKER(this.DAMAGED_MARKER, effect.target, this);
    }

    if (effect instanceof EndTurnEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (cardList.tools.includes(this) && HAS_MARKER(this.DAMAGED_MARKER, cardList, this)) {
            try {
              store.reduceEffect(state, new ToolEffect(player, this));
              MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
            } catch {
              // tool blocked
            }
            REMOVE_MARKER(this.DAMAGED_MARKER, cardList, this);
          }
        });
      });
    }

    return state;
  }
}
