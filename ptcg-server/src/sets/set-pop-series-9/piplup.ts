import { PokemonCard, Stage, CardType, StoreLike, State, StateUtils, PlayerType } from '../../game';
import { PutDamageEffect } from '../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Piplup extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: 10 }];
  public retreat = [C];

  public attacks = [{
    // Water Sport
    name: 'Water Sport',
    cost: [W],
    damage: 10,
    text: 'If Piplup has less Energy attached to it than the Defending Pokemon, this attack does 10 damage plus 10 more damage.'
  }, {
    // Wavelet
    name: 'Wavelet',
    cost: [W, C, C],
    damage: 40,
    text: 'If you have Buizel in play, this attack does 10 damage to each of your opponent\'s Benched Pokemon. (Don\'t apply Weakness and Resistance for Benched Pokemon.)'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Piplup';
  public fullName: string = 'Piplup OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const playerEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, playerEnergy);
      const opponentEnergy = new CheckProvidedEnergyEffect(opponent);
      state = store.reduceEffect(state, opponentEnergy);
      let playerEnergyCount = 0;
      playerEnergy.energyMap.forEach(e => playerEnergyCount += e.provides.length);
      let opponentEnergyCount = 0;
      opponentEnergy.energyMap.forEach(e => opponentEnergyCount += e.provides.length);
      if (playerEnergyCount < opponentEnergyCount) {
        effect.damage += 10;
      }
      return state;
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let isBuizelInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Buizel') {
          isBuizelInPlay = true;
        }
      });
      if (isBuizelInPlay) {
        opponent.bench.forEach(benched => {
          if (benched.cards.length > 0) {
            const dealDamage = new PutDamageEffect(effect, 10);
            dealDamage.target = benched;
            return store.reduceEffect(state, dealDamage);
          }
        });
      }
    }
    return state;
  }
}
