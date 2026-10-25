import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Giratina3 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Strafe',
    cost: [P, C],
    damage: 20,
    text: 'You may switch Giratina with 1 of your Benched Pokémon.'
  }, {
    name: 'Broken-space Blow',
    cost: [P, C, C],
    damage: 50,
    text: 'If the Defending Pokémon is Knocked Out by this attack, put the Defending Pokémon and all cards attached to in the Lost Zone instead of the discard pile.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina PL3';

  public readonly BROKEN_SPACE_BLOW_MARKER = 'BROKEN_SPACE_BLOW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Strafe
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    // Broken-space Blow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.opponent.active.marker.addMarker(this.BROKEN_SPACE_BLOW_MARKER, this);
    }

    if (effect instanceof KnockOutEffect && effect.target.marker.hasMarker(this.BROKEN_SPACE_BLOW_MARKER, this)) {
      effect.target.marker.addMarker('LOST_CITY_MARKER', this);
    }

    if (effect instanceof EndTurnEffect) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      [effect.player, opponent].forEach(p => {
        p.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.marker.hasMarker(this.BROKEN_SPACE_BLOW_MARKER, this)) {
            cardList.marker.removeMarker(this.BROKEN_SPACE_BLOW_MARKER, this);
          }
        });
      });
    }

    return state;
  }
}
