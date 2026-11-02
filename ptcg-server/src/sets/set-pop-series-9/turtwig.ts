import { PokemonCard, Stage, CardType, SpecialCondition, StoreLike, State, PlayerType } from '../../game';
import { HealTargetEffect, AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Turtwig extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: 10 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Absorb
    name: 'Absorb',
    cost: [G],
    damage: 10,
    text: 'Remove 1 damage counter from Turtwig.'
  }, {
    // Parboil
    name: 'Parboil',
    cost: [G, C, C],
    damage: 40,
    text: 'If you have Chimchar in play, this attack does 40 damage plus 20 more damage and the Defending Pokemon is now Burned.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Turtwig';
  public fullName: string = 'Turtwig OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const healEffect = new HealTargetEffect(effect, 10);
      healEffect.target = player.active;
      return store.reduceEffect(state, healEffect);
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let isChimcharInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Chimchar') {
          isChimcharInPlay = true;
        }
      });
      if (isChimcharInPlay) {
        effect.damage += 20;
        const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.BURNED]);
        store.reduceEffect(state, specialCondition);
      }
    }
    return state;
  }
}
