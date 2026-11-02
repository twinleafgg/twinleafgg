import { CardTarget, CardType, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCard, SlotType, SpecialCondition, Stage, State, StateUtils, StoreLike } from '../../../game';
import { AddSpecialConditionsEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Nidorino extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Nidoran ♂';
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Toxic',
    cost: [P, C],
    damage: 0,
    text: 'The Defending Pokémon is now Poisoned. Put 2 damage counters instead of 1 on the Defending Pokémon between turns.'
  },
  {
    name: 'Frustration',
    cost: [C, C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that doesn\'t have any damage counters on it. This attack does 40 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Nidorino';
  public fullName: string = 'Nidorino RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Toxic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]);
      specialCondition.poisonDamage = 20;
      store.reduceEffect(state, specialCondition);
    }

    // Frustration
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasUndamagedActive = opponent.active.cards.length > 0 && opponent.active.damage === 0;
      const hasUndamagedBench = opponent.bench.some(b => b.cards.length > 0 && b.damage === 0);
      if (!hasUndamagedActive && !hasUndamagedBench) {
        return state;
      }

      const blocked: CardTarget[] = [];
      if (opponent.active.damage > 0) {
        blocked.push({ player: PlayerType.TOP_PLAYER, slot: SlotType.ACTIVE, index: 0 });
      }
      opponent.bench.forEach((b, index) => {
        if (b.cards.length === 0 || b.damage > 0) {
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
          const damageEffect = new DealDamageEffect(effect, 40);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 40);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
