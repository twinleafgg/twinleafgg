import { PokemonCard, Stage, CardType, StoreLike, State, ChooseEnergyPrompt, Card, StateUtils, GameMessage } from '../../game';
import { PutDamageEffect, DiscardCardsEffect } from '../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from '../../game/store/prefabs/prefabs';

export class Garchomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Gabite';
  public hp: number = 130;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: 30 }];
  public retreat = [];

  public attacks = [{
    // Dragon Rage
    name: 'Dragon Rage',
    cost: [C],
    damage: 80,
    text: 'Flip 2 coins. If either of them is tails, this attack does nothing.'
  }, {
    // Jet Sword
    name: 'Jet Sword',
    cost: [C, C, C],
    damage: 100,
    text: 'Discard 2 Energy attached to Garchomp and this attack does 10 damage to each of your opponent\'s Benched Pokemon. (Don\'t apply Weakness and Resistance for Benched Pokemon.)'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Garchomp';
  public fullName: string = 'Garchomp OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        if (results.some(r => r === false)) {
          effect.damage = 0;
        }
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);
      state = store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        checkProvidedEnergy.energyMap,
        [C, C],
        { allowCancel: false }
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
      });
      opponent.bench.forEach(benched => {
        if (benched.cards.length > 0) {
          const dealDamage = new PutDamageEffect(effect, 10);
          dealDamage.target = benched;
          return store.reduceEffect(state, dealDamage);
        }
      });
    }
    return state;
  }
}
