import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Voltorb3 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Fastball
    name: 'Fastball',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. Flip a coin. If heads, this attack does 20 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    // Charge Beam
    name: 'Charge Beam',
    cost: [L],
    damage: 10,
    text: 'Search your discard pile for a Lightning Energy card and attach it to Voltorb.'
  }, {
    // Thundershock
    name: 'Thundershock',
    cost: [L, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH3';
  public name: string = 'Voltorb';
  public fullName: string = 'Voltorb SF3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fastball
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return store.prompt(state, new ChoosePokemonPrompt(
        effect.player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        COIN_FLIP_PROMPT(store, state, effect.player, result => {
          if (!result) {
            return;
          }
          if (target === effect.opponent.active) {
            store.reduceEffect(state, new DealDamageEffect(effect, 20));
          } else {
            const damageEffect = new PutDamageEffect(effect, 20);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }
        });
      });
    }

    // Charge Beam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ATTACH_X_TYPE_ENERGY_FROM_DISCARD_TO_1_OF_YOUR_POKEMON(
        store,
        state,
        effect.player,
        1,
        CardType.LIGHTNING,
        {
          destinationSlots: [SlotType.ACTIVE],
          targetFilter: (_list, card) => card === this,
          min: 0,
          allowCancel: true,
        },
      );
    }

    // Thundershock
    if (WAS_ATTACK_USED(effect, 2, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}
