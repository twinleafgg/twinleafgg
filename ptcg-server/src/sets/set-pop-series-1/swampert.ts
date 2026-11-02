import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { ChoosePokemonPrompt } from '../../game';
import { GameMessage } from '../../game';
import { PlayerType } from '../../game';
import { SlotType } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Swampert extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Marshtomp';
  public hp: number = 100;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [{
    // Bubble
    name: 'Bubble',
    cost: [W],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }, {
    // Mud Splash
    name: 'Mud Splash',
    cost: [W, C, C],
    damage: 50,
    text: 'If your opponent has any Benched Pokémon, choose 1 of them and flip a coin. If heads, this attack does 20 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Swampert';
  public fullName: string = 'Swampert P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bubble
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    // Mud Splash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      const hasBench = opponent.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        effect.player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        COIN_FLIP_PROMPT(store, state, effect.player, result => {
          if (result) {
            const damageEffect = new PutDamageEffect(effect, 20);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }
        });
      });
    }

    return state;
  }
}
