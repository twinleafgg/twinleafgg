import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class HopsTrevenant extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Hop\'s Phantump';
  public hp: number = 140;
  protected _tags = [CardTag.HOPS];
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Horrifying Revenge',
    cost: [C],
    damage: 30,
    damageCalculation: '+',
    text: 'If any of your Hop\'s Pokémon were Knocked Out by damage from an attack during your opponent\'s last turn, this attack does 100 more damage.'
  }, {
    name: 'Corner',
    cost: [P, C, C],
    damage: 90,
    text: 'During your opponent\'s next turn, the Defending Pokémon can\'t retreat.'
  }];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Hop\'s Trevenant';
  public fullName: string = 'Hop\'s Trevenant ASC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Horrifying Revenge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (WAS_POKEMON_KNOCKED_OUT_DURING_OPPONENTS_LAST_TURN(player, { byAttackDamage: true })) {
        effect.damage += 100;
      }
      return state;
    }

    // Corner
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }

    return state;
  }
}
