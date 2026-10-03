import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PlayerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Xerneas extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 120;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Rainbow Force',
    cost: [Y, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'This attack does 30 more damage for each different type of Pokémon on your Bench.'
  },
  {
    name: 'Power Creation',
    cost: [Y, Y, C, C],
    damage: 80,
    damageCalculation: '+',
    text: 'If this Pokémon was healed during this turn, this attack does 80 more damage.'
  }];

  public set: string = 'BKT';
  public setNumber: string = '107';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Xerneas';
  public fullName: string = 'Xerneas BKT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rainbow Force
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const types = new Set<CardType>();

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList === player.active) { return; }
        if (cardList.cards.length === 0) { return; }

        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        checkType.cardTypes.forEach(t => types.add(t));
      });

      effect.damage += 30 * types.size;
    }

    // Power Creation
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.player.active.healedThisTurn) {
        effect.damage += 80;
      }
    }

    return state;
  }
}
