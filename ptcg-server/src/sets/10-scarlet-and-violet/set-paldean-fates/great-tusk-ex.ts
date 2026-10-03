import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PowerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AfterDamageEffect, ApplyWeaknessEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GreatTuskex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex, CardTag.ANCIENT];
  public cardType: CardType[] = [F];
  public hp: number = 250;
  public weakness = [{ type: P }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Quaking Demolition',
      powerType: PowerType.ABILITY,
      text: 'Once at the end of your turn (after your attack), if this Pokémon is in the Active Spot, you must discard the top 5 cards of your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Great Bash',
      cost: [F, C, C, C],
      damage: 260,
      shredAttack: true,
      text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon.",
    },
  ];

  public set: string = 'PAF';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Great Tusk ex';
  public fullName: string = 'Great Tusk ex PAF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Quaking Demolition (who wanted this why was this made in what context would anyone play this card without path to the peak in format)
    // even with path it didn't see play outside of an LDF video why was this made they could've added another semi-playable card but instead we got given this filth
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      try {
        const powerEffect = new PowerEffect(player, this.powers[0], this);
        store.reduceEffect(state, powerEffect);
      } catch {
        return state;
      }

      if (player.active.getPokemonCard() === this) {
        MOVE_CARDS(store, state, player.deck, player.discard, { count: 5, sourceCard: this });
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const applyWeakness = new ApplyWeaknessEffect(effect, 260);
      store.reduceEffect(state, applyWeakness);
      const damage = applyWeakness.damage;

      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }

    return state;
  }
}
