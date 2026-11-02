import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { NEXT_TURN_ATTACK_BASE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HeracrossE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Focus Energy',
    cost: [],
    damage: 0,
    text: 'During your next turn, Heracross E4\'s Megahorn attack\'s base damage is 100.'
  }, {
    name: 'Megahorn',
    cost: [G, C],
    damage: 50,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Heracross E4';
  public fullName: string = 'Heracross E4 RR';

  public readonly MEGAHORN_MARKER = 'MEGAHORN_MARKER';
  public readonly MEGAHORN_CLEAR_MARKER = 'MEGAHORN_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    NEXT_TURN_ATTACK_BASE_DAMAGE(effect, {
      setupAttack: this.attacks[0],
      boostedAttack: this.attacks[1],
      source: this,
      baseDamage: 100,
      bonusMarker: this.MEGAHORN_MARKER,
      clearMarker: this.MEGAHORN_CLEAR_MARKER,
    });

    // Megahorn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          effect.damage = 0;
        }
      });
    }

    return state;
  }
}
