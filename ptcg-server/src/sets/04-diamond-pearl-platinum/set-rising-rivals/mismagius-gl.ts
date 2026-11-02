import { CardTag, CardType, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MismagiusGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Psychic Removal',
    cost: [P],
    damage: 10,
    text: 'Flip 2 coins. If both of them are heads, discard all Energy attached to the Defending Pokémon.'
  },
  {
    name: 'Grudge',
    cost: [P, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Prize card your opponent has taken.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Mismagius GL';
  public fullName: string = 'Mismagius GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psychic Removal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.filter(r => r).length === 2) {
          const energyCards = opponent.active.cards.filter(c => c.superType === SuperType.ENERGY);
          if (energyCards.length > 0) {
            const discardEnergy = new DiscardCardsEffect(effect, energyCards);
            discardEnergy.target = opponent.active;
            store.reduceEffect(state, discardEnergy);
          }
        }
      });
    }

    // Grudge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const prizesTaken = 6 - effect.opponent.getPrizeLeft();
      effect.damage += prizesTaken * 10;
    }

    return state;
  }
}
