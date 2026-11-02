import { PlayerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class CameruptG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [R];
  public hp: number = 100;
  public weakness = [{ type: W, value: +30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Searing Flame',
    cost: [R, C],
    damage: 20,
    text: 'The Defending Pokémon is now Burned.'
  }, {
    name: 'Earth Power',
    cost: [C, C, C, C],
    damage: 60,
    text: 'Flip 2 coins. This attack does 10 damage times the number of heads to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Camerupt G';
  public fullName: string = 'Camerupt G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Searing Flame
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
    }

    // Earth Power
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads > 0) {
          opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
            if (cardList !== opponent.active) {
              const damage = new PutDamageEffect(effect, 10 * heads);
              damage.target = cardList;
              store.reduceEffect(state, damage);
            }
          });
        }
      });
    }

    return state;
  }
}
