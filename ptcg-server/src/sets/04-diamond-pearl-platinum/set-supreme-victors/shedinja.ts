import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AbstractAttackEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shedinja extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nincada';
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Marvel Shell',
    powerType: PowerType.POKEBODY,
    text: 'Prevent all effects of attacks, including damage, done to Shedinja by your opponent\'s Pokémon that has any Poké-Powers or Poké-Bodies.'
  }];

  public attacks = [{
    name: 'Spike Wound',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that has any damage counters on it. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '44';
  public name: string = 'Shedinja';
  public fullName: string = 'Shedinja SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Marvel Shell
    if (effect instanceof AbstractAttackEffect) {
      if (effect.target.getPokemonCard() !== this) {
        return state;
      }
      const owner = StateUtils.findOwner(state, effect.target);
      const sourceOwner = StateUtils.findOwner(state, effect.source);
      if (owner === sourceOwner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const attacker = effect.source.getPokemonCard();
      if (!attacker) {
        return state;
      }
      const powersEffect = new CheckPokemonPowersEffect(sourceOwner, attacker);
      store.reduceEffect(state, powersEffect);
      if (powersEffect.powers.some(power =>
        power.powerType === PowerType.POKEPOWER || power.powerType === PowerType.POKEBODY
      )) {
        effect.preventDefault = true;
      }
    }

    // Spike Wound
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasDamaged = opponent.active.damage > 0 || opponent.bench.some(b => b.cards.length > 0 && b.damage > 0);
      if (!hasDamaged) {
        return state;
      }
      const blocked: CardTarget[] = [];
      if (opponent.active.cards.length === 0 || opponent.active.damage === 0) {
        blocked.push({ player: PlayerType.TOP_PLAYER, slot: SlotType.ACTIVE, index: 0 });
      }
      opponent.bench.forEach((b, index) => {
        if (b.cards.length === 0 || b.damage === 0) {
          blocked.push({ player: PlayerType.TOP_PLAYER, slot: SlotType.BENCH, index });
        }
      });
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected[0];
        if (target === opponent.active) {
          const damageEffect = new DealDamageEffect(effect, 30);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 30);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
