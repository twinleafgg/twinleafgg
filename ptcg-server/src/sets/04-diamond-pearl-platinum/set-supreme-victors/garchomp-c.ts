import { PlayerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GarchompC extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [C];
  public hp: number = 80;
  public weakness = [{ type: C, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Claw Swipe',
    cost: [C, C],
    damage: 30,
    text: '',
  }, {
    name: 'Earthquake',
    cost: [C, C, C],
    damage: 50,
    text: 'This attack does 10 damage to each of your Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)',
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';
  public name: string = 'Garchomp C';
  public fullName: string = 'Garchomp C SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Earthquake
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, card => {
        if (card !== player.active) {
          const damage = new PutDamageEffect(effect, 10);
          damage.target = card;
          store.reduceEffect(state, damage);
        }
      });
    }

    return state;
  }
}
