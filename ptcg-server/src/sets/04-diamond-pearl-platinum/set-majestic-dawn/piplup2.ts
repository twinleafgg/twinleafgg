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
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Piplup2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    // Splatter
    name: 'Splatter',
    cost: [W],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage to that Pokémon. This attack\'s damage isn\'t affected by Weakness or Resistance.'
  }];

  public set: string = 'MD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Piplup';
  public fullName: string = 'Piplup MD2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Splatter
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return store.prompt(state, new ChoosePokemonPrompt(
        effect.player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const damageEffect = new PutDamageEffect(effect, 10);
        damageEffect.target = selected[0];
        store.reduceEffect(state, damageEffect);
      });
    }

    return state;
  }
}
