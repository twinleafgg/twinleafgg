import { Attack, PokemonCard } from '../../../game';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class RapidStrikeScrollOfSwirls extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  protected _tags = [CardTag.RAPID_STRIKE];

  public regulationMark = 'E';

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '131';

  public name: string = 'Rapid Strike Scroll of Swirls';

  public fullName: string = 'Rapid Strike Scroll of Swirls BST';

  public attacks: Attack[] = [
    {
      name: 'Matchless Maelstrom',
      cost: [CardType.FIGHTING, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: "This attack does 30 damage to each of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public text: string =
    'The Rapid Strike Pokémon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      if (
        !player.active.cards.some((c) => c instanceof PokemonCard && c.hasTag(CardTag.RAPID_STRIKE))
      ) {
        return state;
      }

      const opponent = effect.opponent;
      const benched = opponent.bench.filter((b) => b.cards.length > 0);

      effect.damage = 30;

      benched.forEach((target) => {
        const damageEffect = new PutDamageEffect(effect, 30);
        damageEffect.target = target;
        store.reduceEffect(state, damageEffect);
      });
    }

    return state;
  }
}
