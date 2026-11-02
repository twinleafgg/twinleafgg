import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GastrodonWestSea extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shellos West Sea';
  public hp: number = 110;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Tackle',
    cost: [C, C, C],
    damage: 50,
    text: ''
  }, {
    name: 'Muddy Bomb',
    cost: [F, C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 30 damage to that Pokémon and 10 damage to each of your opponent\'s other Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Raging Sea',
    cost: [F, C, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Does 60 damage plus 10 more damage for each of your Benched Pokémon that has any damage counters on it.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Gastrodon West Sea';
  public fullName: string = 'Gastrodon West Sea RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Muddy Bomb
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false },
      ), selected => {
        const chosen = selected[0];
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
          const damage = cardList === chosen ? 30 : 10;
          if (cardList === opponent.active) {
            const damageEffect = new DealDamageEffect(effect, damage);
            damageEffect.target = cardList;
            store.reduceEffect(state, damageEffect);
          } else {
            const damageEffect = new PutDamageEffect(effect, damage);
            damageEffect.target = cardList;
            store.reduceEffect(state, damageEffect);
          }
        });
      });
    }

    // Raging Sea
    if (WAS_ATTACK_USED(effect, 2, this)) {
      let damagedBench = 0;
      effect.player.bench.forEach(bench => {
        if (bench.cards.length > 0 && bench.damage > 0) {
          damagedBench += 1;
        }
      });
      effect.damage += 10 * damagedBench;
    }

    return state;
  }
}
