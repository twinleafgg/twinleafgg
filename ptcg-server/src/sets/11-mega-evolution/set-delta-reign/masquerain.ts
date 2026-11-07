import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_CANNOT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { BUG_OUT } from '../../../game/store/prefabs/shared-attack-prefabs';

export class Masquerain extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Surskit';
  public cardType: CardType[] = [G];
  public hp: number = 110;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Frightening Patterns',
    cost: [C],
    damage: 30,
    text: 'During your opponent\'s next turn, the Defending Pokémon can\'t use attacks.'
  },
  {
    name: 'Bug Out',
    cost: [G],
    damage: 50,
    damageCalculation: 'x',
    text: 'Reveal the bottom 7 cards of your deck, and this attack does 50 damage for each Pokémon you find there that has the Bug Out attack. Then, shuffle any revealed Pokémon back into your deck. Discard the other cards.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Masquerain';
  public fullName: string = 'Masquerain M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Scary Patterns
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_CANNOT_ATTACK(store, state, effect, this);
    }

    // Bug Out
    if (WAS_ATTACK_USED(effect, 1, this)) {
      BUG_OUT(store, state, effect);
    }

    return state;
  }
}
