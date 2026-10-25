import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';

export class AmuletCoin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Amulet Coin';
  public fullName: string = 'Amulet Coin GE';
  public text: string = 'Attach Amulet Coin to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. If the Pokémon Amulet Coin is attached to is your Active Pokémon at the end of your turn, draw a card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && effect.player.active.tools.includes(this)) {
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }
      DRAW_CARDS(store, state, effect.player, 1);
    }

    return state;
  }
}
