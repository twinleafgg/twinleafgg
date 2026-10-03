import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED, DISCARD_TOP_X_CARDS_FROM_YOUR_DECK } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_ATTACKS_DO_MORE_DAMAGE_WHILE_ACTIVE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Haxorus extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Fraxure';
  public cardType: CardType[] = [N];
  public hp: number = 160;
  public weakness = [{ type: Y }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Dragon Dance',
    cost: [C],
    damage: 0,
    text: 'As long as this Haxorus is your Active Pokémon, each of its attacks does 100 more damage (before applying Weakness and Resistance). You can\'t add more than 100 damage in this way.'
  },
  {
    name: 'Sharp Fang',
    cost: [C],
    damage: 60,
    text: ''
  },
  {
    name: 'Dragon Pulse',
    cost: [F, M],
    damage: 130,
    text: 'Discard the top 3 cards of your deck.'
  }];

  public set: string = 'BKT';
  public setNumber: string = '111';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Haxorus';
  public fullName: string = 'Haxorus BKT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dragon Dance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_ATTACKS_DO_MORE_DAMAGE_WHILE_ACTIVE(effect, 100, 100);
    }
    // Sharp Fang
    if (WAS_ATTACK_USED(effect, 2, this)) {
      DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, effect.player, 3, this, effect);
    }

    return state;
  }
}
