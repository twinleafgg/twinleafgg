import { CardType, PokemonCard, Stage, State, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Articuno2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Diamond Dust',
    cost: [W, W, W],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed and this attack does 10 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '148';
  public name: string = 'Articuno';
  public fullName: string = 'Articuno SV2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Diamond Dust
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
          effect.opponent.bench.forEach(benched => {
            if (benched.cards.length > 0) {
              const damageEffect = new PutDamageEffect(effect, 10);
              damageEffect.target = benched;
              store.reduceEffect(state, damageEffect);
            }
          });
        }
      });
    }

    return state;
  }
}
