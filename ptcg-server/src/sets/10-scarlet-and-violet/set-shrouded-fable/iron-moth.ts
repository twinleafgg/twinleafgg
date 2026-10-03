import {
  PokemonCard,
  Stage,
  CardType,
  StoreLike,
  State,
  StateUtils,
  CardTag,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class IronMoth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 120;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];
  protected _tags = [CardTag.FUTURE];

  public attacks = [
    {
      name: 'Suction',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 30,
      text: "Heal from this Pokémon the same amount of damage you did to your opponent's Active Pokémon.",
    },
    {
      name: 'Anachronism Repulsor',
      cost: [CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
      damage: 120,
      text: "During your opponent's next turn, prevent all damage done to this Pokémon by attacks from Ancient Pokémon.",
    },
  ];
  public regulationMark = 'H';
  public set: string = 'SFA';
  public name: string = 'Iron Moth';
  public fullName: string = 'Iron Moth SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      // Absorption
      if (effect.damage > 0) {
        const target = StateUtils.getTarget(state, player, effect.target);
        const healEffect = new HealEffect(player, target, effect.damage);
        state = store.reduceEffect(state, healEffect);
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      PREVENT_DAMAGE(store, state, effect, this, { sourceTags: [CardTag.ANCIENT] });
    }

    return state;
  }
}
