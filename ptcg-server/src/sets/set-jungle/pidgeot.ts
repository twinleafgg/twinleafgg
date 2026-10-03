import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../game';
import { Effect } from '../../game/store/effects/effect';

import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { WAS_ATTACK_USED, MOVE_POKEMON_OFF_BOARD } from '../../game/store/prefabs/prefabs';


export class Pidgeot extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Pidgeotto';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 80;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public attacks = [{
    name: 'Wing Attack',
    cost: [C, C],
    damage: 20,
    text: ''
  },
  {
    name: 'Hurricane',
    cost: [C, C, C],
    damage: 30,
    text: 'Unless this attack Knocks Out the Defending Pokémon, return the Defending Pokémon and all cards attached to it to your opponent\'s hand.'
  }];

  public set: string = 'JU';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '8';

  public name: string = 'Pidgeot';

  public fullName: string = 'Pidgeot JU';

  public BOUNCE_ACTIVE_MARKER = 'BOUNCE_ACTIVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      opponent.active.marker.addMarker(this.BOUNCE_ACTIVE_MARKER, this);
    }

    if (effect instanceof AfterDamageEffect && effect.player.active.marker.hasMarker(this.BOUNCE_ACTIVE_MARKER, this)) {
      const player = effect.player;
      MOVE_POKEMON_OFF_BOARD(store, state, effect.player.active, {
        pokemonDestination: player.hand,
        sourceCard: this,
      });
    }

    if (effect instanceof EndTurnEffect && effect.player.active.marker.hasMarker(this.BOUNCE_ACTIVE_MARKER, this)) {
      effect.player.active.marker.removeMarker(this.BOUNCE_ACTIVE_MARKER, this);
    }
    return state;
  }
}
