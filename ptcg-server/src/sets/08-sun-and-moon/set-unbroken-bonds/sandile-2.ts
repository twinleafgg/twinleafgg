import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutAttackEffect } from '../../../game/store/effects/game-effects';
import { ARM_NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS } from '../../../game/store/prefabs/attack-effects';

export class Sandile2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];


  public attacks = [{
    name: 'Grandiose Fangs',
    cost: [C, C, C],
    damage: 30,
    text: 'If your opponent\'s Pokémon is Knocked Out by damage from this attack, this Pokémon\'s attacks do 120 more damage to your opponent\'s Active Pokémon during your next turn (before applying Weakness and Resistance).'
  }];

  public set: string = 'UNB';
  public setNumber: string = '114';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sandile';
  public fullName: string = 'Sandile UNB 114';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutAttackEffect && effect.attack === this.attacks[0]) {
      if (!effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      const cardOwner = StateUtils.findOwner(state, StateUtils.findCardList(state, this));
      if (effect.player !== cardOwner) {
        ARM_NEXT_TURN_ATTACK_BONUS_ALL_ATTACKS(cardOwner.active, this, 120);
      }
    }

    return state;
  }
}
