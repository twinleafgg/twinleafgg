import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';

export class Buneary extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Bunny Hop',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon that doesn\'t have any damage counters on it. This attack does 20 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Buneary';
  public fullName: string = 'Buneary AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bunny Hop
    if (WAS_ATTACK_USED(effect, 0, this)) {
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
          const damageEffect = new DealDamageEffect(effect, 20);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        } else {
          const damageEffect = new PutDamageEffect(effect, 20);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
