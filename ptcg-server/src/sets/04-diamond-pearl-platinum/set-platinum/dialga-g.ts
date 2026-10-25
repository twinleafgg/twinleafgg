import { State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { OPPONENT_CANNOT_PLAY_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class DialgaG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Deafen',
    cost: [M, C],
    damage: 10,
    text: 'Your opponent can\'t play any Trainer cards or Stadium cards from his or her hand during your opponent\'s next turn.'
  }, {
    name: 'Second Strike',
    cost: [M, C, C],
    damage: 50,
    damageCalculation: '+',
    text: 'If the Defending Pokémon already has 2 or more damage counters on it, this attack does 50 damage plus 20 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Dialga G';
  public fullName: string = 'Dialga G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Deafen
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENT_CANNOT_PLAY_CARDS(store, state, effect, this, { item: true, supporter: true, tool: true, stadium: true });
    }

    // Second Strike
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.damage >= 20) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 20);
      }
    }

    return state;
  }
}
