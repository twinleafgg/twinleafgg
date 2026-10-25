import { PokemonCard, Stage, CardType, SpecialCondition, StoreLike, State, PlayerType } from '../../game';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../game/store/prefabs/prefabs';

export class Chimchar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: 10 }];
  public retreat = [C];

  public attacks = [{
    // Serial Swipes
    name: 'Serial Swipes',
    cost: [R],
    damage: 10,
    text: 'Flip 4 coins. This attack does 10 damage times the number of heads.'
  }, {
    // Sleepy
    name: 'Sleepy',
    cost: [R, C, C],
    damage: 40,
    text: 'If you have Piplup in play, this attack does 40 damage plus 20 more damage and the Defending Pokemon is now Asleep.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Chimchar';
  public fullName: string = 'Chimchar OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 4, results => {
        let heads: number = 0;
        results.forEach(r => { heads += r ? 1 : 0; });
        effect.damage = 10 * heads;
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let isPiplupInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Piplup') {
          isPiplupInPlay = true;
        }
      });
      if (isPiplupInPlay) {
        effect.damage += 20;
        const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
        store.reduceEffect(state, specialCondition);
      }
      return state;
    }
    return state;
  }
}
