import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, THIS_ATTACK_DOES_X_MORE_DAMAGE, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Persian extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Meowth';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Sharpen Claws',
    cost: [C],
    damage: 0,
    text: 'Flip 3 coins. For each heads, discard a card from your opponent\'s hand without looking.'
  },
  {
    name: 'Sneaky Attack',
    cost: [C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If Persian has any Darkness Energy attached to it, this attack does 30 damage plus 30 more damage.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Persian';
  public fullName: string = 'Persian HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sharpen Claws
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        const heads = results.filter(r => r).length;
        for (let i = 0; i < heads; i++) {
          if (opponent.hand.cards.length === 0) {
            break;
          }
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const randomCard = opponent.hand.cards[randomIndex];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
            cards: [randomCard],
            sourceCard: this,
          });
        }
      });
    }

    // Sneaky Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkEnergy);
      const hasDarkness = checkEnergy.energyMap.some(em =>
        em.provides.includes(CardType.DARK) || em.provides.includes(CardType.ANY)
      );
      if (hasDarkness) {
        THIS_ATTACK_DOES_X_MORE_DAMAGE(effect, store, state, 30);
      }
    }

    return state;
  }
}
