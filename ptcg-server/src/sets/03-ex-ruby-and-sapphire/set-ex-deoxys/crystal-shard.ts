import { StateUtils } from '../../../game';
import { TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {
  ADD_MARKER,
  HAS_MARKER,
  IS_TOOL_BLOCKED,
  MOVE_CARDS,
  REMOVE_MARKER,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class CrystalShard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'DX';
  public name: string = 'Crystal Shard';
  public fullName: string = 'Crystal Shard DX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';

  public text: string =
    "As long as this card is attached to a Pokémon, that Pokémon's type is [C]. If that Pokémon attacks, discard this card at the end of the turn.";

  public readonly ATTACKED_MARKER = 'ATTACKED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckPokemonTypeEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);
      if (!IS_TOOL_BLOCKED(store, state, player, this)) {
        effect.cardTypes = [C];
      }
    }

    if (effect instanceof AttackEffect && effect.source.tools.includes(this)) {
      ADD_MARKER(this.ATTACKED_MARKER, effect.player, this);
      console.log('Crystal Shard was used this turn, adding marker');
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.ATTACKED_MARKER, effect.player, this)) {
      const player = effect.player;
      console.log('Crystal Shard was used this turn, moving to discard');
      MOVE_CARDS(store, state, player.active, player.discard, { cards: [this] });
      REMOVE_MARKER(this.ATTACKED_MARKER, player, this);
    }

    return state;
  }
}
