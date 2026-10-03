import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';
import { THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class GardevoirEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 170;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Life Leap',
      cost: [Y],
      damage: 20,
      text: "Heal from this Pokémon the same amount of damage you did to your opponent's Active Pokémon.",
    },
    {
      name: 'Shining Wind',
      cost: [Y, Y, Y],
      damage: 100,
      text: "During your opponent's next turn, this Pokémon has no Weakness.",
    },
  ];

  public set: string = 'PRC';
  public name: string = 'Gardevoir-EX';
  public fullName: string = 'Gardevoir EX PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Life Leap
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const healTargetEffect = new HealTargetEffect(effect, effect.damage);
      healTargetEffect.target = player.active;
      state = store.reduceEffect(state, healTargetEffect);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}
