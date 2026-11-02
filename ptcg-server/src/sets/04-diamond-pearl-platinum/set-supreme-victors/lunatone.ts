import { PlayerType, PokemonCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { AbstractAttackEffect, DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lunatone extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public retreat = [];

  public powers = [{
    name: 'Marvel Eyes',
    powerType: PowerType.POKEBODY,
    text: 'If you have Solrock in play, prevent all effects of attacks, including damage, done to any of your Lunatone or Solrock by your opponent\'s Pokémon LV.X.'
  }];

  public attacks = [{
    name: 'Gravity Wave',
    cost: [P, C],
    damage: 30,
    text: 'Does 30 damage to each of your opponent\'s Benched Pokémon that doesn\'t have a Retreat Cost. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Lunatone';
  public fullName: string = 'Lunatone SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Marvel Eyes
    if (effect instanceof AbstractAttackEffect || effect instanceof PutDamageEffect || effect instanceof DealDamageEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      const targetCard = effect.target.getPokemonCard();
      if (targetCard === undefined || (targetCard.name !== 'Lunatone' && targetCard.name !== 'Solrock')) {
        return state;
      }
      if (StateUtils.findOwner(state, effect.source) === owner) {
        return state;
      }

      let isInPlay = false;
      let hasSolrock = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isInPlay = true;
        }
        if (card.name === 'Solrock') {
          hasSolrock = true;
        }
      });
      if (!isInPlay || !hasSolrock || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      const attacker = effect.source.getPokemonCard();
      if (!attacker || (!attacker.hasTag(CardTag.POKEMON_LV_X) && attacker.stage !== Stage.LV_X)) {
        return state;
      }
      effect.preventDefault = true;
    }

    // Gravity Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      opponent.bench.forEach(cardList => {
        if (cardList.cards.length === 0) {
          return;
        }
        const pokemonCard = cardList.getPokemonCard();
        if (!pokemonCard) {
          return;
        }
        const checkRetreat = new CheckRetreatCostEffect(opponent);
        checkRetreat.cost = [...pokemonCard.retreat];
        store.reduceEffect(state, checkRetreat);
        if (checkRetreat.cost.length === 0) {
          const putDamage = new PutDamageEffect(effect, 30);
          putDamage.target = cardList;
          store.reduceEffect(state, putDamage);
        }
      });
    }

    return state;
  }
}
