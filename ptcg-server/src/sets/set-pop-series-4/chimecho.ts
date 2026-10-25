import { PokemonCard, Stage, CardTag, CardType, StoreLike, State } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Chimecho extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 60;
  public cardType: CardType[] = [M];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    // Wrap
    name: 'Wrap',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }, {
    // Sonicboom
    name: 'Sonicboom',
    cost: [M, C],
    damage: 30,
    text: 'This attack\'s damage isn\'t affected by Weakness or Resistance.'
  }];

  public set: string = 'P4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Chimecho δ';
  public fullName: string = 'Chimecho δ P4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wrap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    // Sonicboom
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.ignoreWeakness = true;
      effect.ignoreResistance = true;
    }
    return state;
  }
}
