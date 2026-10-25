import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { COIN_FLIP_PROMPT, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ForretressG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Shell Scatter',
    cost: [C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Forretress G can\'t use Shell Scatter during your next turn.'
  }, {
    name: 'Bomb Risk',
    cost: [M, M, C],
    damage: 80,
    text: 'Does 10 damage to each Benched Pokémon (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon.) Flip a coin. If tails, Forretress G does 80 damage to itself.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Forretress G';
  public fullName: string = 'Forretress G RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shell Scatter
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage = 10;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList === opponent.active) {
          return;
        }
        const damageEffect = new PutDamageEffect(effect, 10);
        damageEffect.target = cardList;
        store.reduceEffect(state, damageEffect);
      });
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[0]);
    }

    // Bomb Risk
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const damageBench = (slot: typeof player.bench[number]) => {
        if (slot.cards.length > 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = slot;
          store.reduceEffect(state, damageEffect);
        }
      };
      opponent.bench.forEach(damageBench);
      player.bench.forEach(damageBench);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          const selfDamage = new PutDamageEffect(effect, 80);
          selfDamage.target = player.active;
          store.reduceEffect(state, selfDamage);
        }
      });
    }

    return state;
  }
}
