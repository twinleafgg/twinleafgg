import { PokemonCard, Stage, CardType, SpecialCondition, StoreLike, State, PlayerType } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';

export class Pachirisu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Thunder Wave
    name: 'Thunder Wave',
    cost: [L],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokemon is now Paralyzed.'
  }, {
    // Poison Berry
    name: 'Poison Berry',
    cost: [L, C],
    damage: 20,
    text: 'If you have Croagunk in play, this attack does 20 damage plus 20 more damage and the Defending Pokemon is now Poisoned.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Pachirisu';
  public fullName: string = 'Pachirisu OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, player, flipResult => {
        if (flipResult) {
          const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.PARALYZED]);
          store.reduceEffect(state, specialCondition);
        }
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let isCroagunkInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Croagunk') {
          isCroagunkInPlay = true;
        }
      });
      if (isCroagunkInPlay) {
        effect.damage += 20;
        const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]);
        store.reduceEffect(state, specialCondition);
      }
      return state;
    }
    return state;
  }
}
