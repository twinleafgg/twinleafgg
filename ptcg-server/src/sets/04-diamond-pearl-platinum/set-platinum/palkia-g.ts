import { PlayerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class PalkiaG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Splashing Turn',
    cost: [W, C],
    damage: 20,
    text: 'You may switch Palkia G with 1 of your Benched Pokémon.'
  }, {
    name: 'Pearl Breath',
    cost: [W, C, C],
    damage: 50,
    text: 'Does 10 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Palkia G';
  public fullName: string = 'Palkia G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Splashing Turn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
        }
      });
    }

    // Pearl Breath
    if (WAS_ATTACK_USED(effect, 1, this)) {
      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList !== effect.opponent.active) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
