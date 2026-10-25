import { PokemonCard, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Carnivine extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Vine Whip',
    cost: [C, C],
    damage: 20,
    text: ''
  }, {
    name: 'Swallow',
    cost: [G, G, C],
    damage: 30,
    text: 'Flip a coin. If heads, remove from Carnivine the number of damage counters equal to the damage you did to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Carnivine';
  public fullName: string = 'Carnivine SV';

  private swallowHeads = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Swallow
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.swallowHeads = false;
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        this.swallowHeads = result;
      });
    }

    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[1]
      && this.swallowHeads && effect.damage > 0
      && effect.player.active.getPokemonCard() === this) {
      store.reduceEffect(state, new HealEffect(effect.player, effect.player.active, effect.damage));
    }

    return state;
  }
}
