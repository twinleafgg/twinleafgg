import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND } from '../../../game/store/prefabs/attack-effects';
import { AFTER_ATTACK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { BUG_OUT } from '../../../game/store/prefabs/shared-attack-prefabs';

export class Combee extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 50;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Fade Out',
    cost: [G],
    damage: 10,
    text: 'Put this Pokémon and all attached cards into your hand.'
  },
  {
    name: 'Bug Out',
    cost: [C, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Reveal the bottom 7 cards of your deck, and this attack does 50 damage for each Pokémon you find there that has the Bug Out attack. Then, shuffle any revealed Pokémon back into your deck. Discard the other cards.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Combee';
  public fullName: string = 'Combee M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fade Away
    if (AFTER_ATTACK(effect, 0, this)) {
      PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND(store, state, effect);
    }

    // Bug Out
    if (WAS_ATTACK_USED(effect, 1, this)) {
      BUG_OUT(store, state, effect);
    }

    return state;
  }
}
