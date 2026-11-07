import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { BUG_OUT } from '../../../game/store/prefabs/shared-attack-prefabs';

export class Spinarak extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Poison Sting',
    cost: [D],
    damage: 0,
    text: 'Your opponent\'s Active Pokemon is now Poisoned.'
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
  public setNumber: string = '58';
  public name: string = 'Spinarak';
  public fullName: string = 'Spinarak M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Sting
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
    }

    // Bug Out
    if (WAS_ATTACK_USED(effect, 1, this)) {
      BUG_OUT(store, state, effect);
    }

    return state;
  }
}
