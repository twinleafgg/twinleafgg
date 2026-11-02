import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { PlaceDamageCountersEffect, RetreatEffect } from '../../../game/store/effects/game-effects';
import { IS_POKEBODY_BLOCKED, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dugtrio extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Diglett';
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: W, value: +20 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Sinkhole',
    powerType: PowerType.POKEBODY,
    text: 'If your opponent\'s Active Pokémon retreats, put 2 damage counters on that Pokémon.'
  }];

  public attacks = [{
    name: 'Push Down',
    cost: [F, C],
    damage: 30,
    text: 'Your opponent switches the Defending Pokémon with 1 of his or her Benched Pokémon.'
  }, {
    name: 'Magnitude',
    cost: [F, F, C],
    damage: 70,
    text: 'Does 10 damage to each Benched Pokémon (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '24';
  public name: string = 'Dugtrio';
  public fullName: string = 'Dugtrio PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sinkhole
    if (effect instanceof RetreatEffect) {
      const retreatingPlayer = effect.player;
      const dugtrioOwner = StateUtils.getOpponent(state, retreatingPlayer);
      let isInPlay = false;
      dugtrioOwner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isInPlay = true;
        }
      });
      if (!isInPlay) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, dugtrioOwner, this)) {
        return state;
      }
      store.reduceEffect(state, new PlaceDamageCountersEffect(
        dugtrioOwner,
        retreatingPlayer.active,
        20,
        this,
        this.powers[0]
      ));
    }

    // Push Down
    if (WAS_ATTACK_USED(effect, 0, this)) {
      SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.opponent);
    }

    // Magnitude
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      opponent.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });
      player.bench.forEach(benchSlot => {
        if (benchSlot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = benchSlot;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
