import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dialga2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Time Aura',
    powerType: PowerType.POKEBODY,
    text: 'As long as Dialga is your Active Pokémon, your opponent can\'t play any Pokémon from his or her hand to evolve his or her Active Pokémon.'
  }];

  public attacks = [{
    name: 'Metal Burn',
    cost: [M, M, C, C],
    damage: 100,
    text: 'Discard all Metal Energy attached to Dialga.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Time Aura
    if (effect instanceof EvolveEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.active.getPokemonCard() !== this) {
        return state;
      }
      if (effect.target !== player.active) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, opponent, this)) {
        return state;
      }
      throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
    }

    // Metal Burn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const cards = checkProvidedEnergy.energyMap
        .filter(em => em.provides.includes(M) || em.provides.includes(CardType.ANY))
        .map(em => em.card);
      const uniqueCards = [...new Set(cards)];
      if (uniqueCards.length > 0) {
        const discardEnergy = new DiscardCardsEffect(effect, uniqueCards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
      }
    }

    return state;
  }
}
