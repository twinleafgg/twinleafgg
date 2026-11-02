import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Bronzong extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Bronzor';
  public hp: number = 90;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Oracle Arrow',
    cost: [M, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that has any damage counters on it. This attack does 40 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Half-Gravity',
    cost: [M, C, C],
    damage: 60,
    text: 'The Retreat Cost for Bronzong is 0 until the end of your next turn.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '14';
  public name: string = 'Bronzong';
  public fullName: string = 'Bronzong AR';

  public readonly HALF_GRAVITY_MARKER = 'HALF_GRAVITY_MARKER';
  public readonly HALF_GRAVITY_CLEAR_MARKER = 'HALF_GRAVITY_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Oracle Arrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasDamaged = opponent.active.damage > 0 || opponent.bench.some(b => b.cards.length > 0 && b.damage > 0);
      if (!hasDamaged) {
        return state;
      }
      const blocked: CardTarget[] = [];
      if (opponent.active.damage === 0) {
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

    // Half-Gravity
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_MARKER(this.HALF_GRAVITY_MARKER, effect.player, this);
      REMOVE_MARKER(this.HALF_GRAVITY_CLEAR_MARKER, effect.player, this);
    }

    if (effect instanceof CheckRetreatCostEffect && effect.player.active.getPokemonCard() === this) {
      if (HAS_MARKER(this.HALF_GRAVITY_MARKER, effect.player, this)) {
        effect.cost = [];
      }
    }

    if (effect instanceof EndTurnEffect && HAS_MARKER(this.HALF_GRAVITY_MARKER, effect.player, this)) {
      if (HAS_MARKER(this.HALF_GRAVITY_CLEAR_MARKER, effect.player, this)) {
        REMOVE_MARKER(this.HALF_GRAVITY_MARKER, effect.player, this);
        REMOVE_MARKER(this.HALF_GRAVITY_CLEAR_MARKER, effect.player, this);
      } else {
        ADD_MARKER(this.HALF_GRAVITY_CLEAR_MARKER, effect.player, this);
      }
    }

    return state;
  }
}
