import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, CardList, GameError, GameMessage, OrderCardsPrompt, ChooseEnergyPrompt, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Braixen extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Fennekin';
  public cardType: CardType[] = [CardType.FIRE];
  public hp: number = 80;
  public weakness = [{ type: CardType.WATER }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Clairvoyant Eye',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Look at the top 3 cards of your deck and put them back on top of your deck in any order.'
  },
  {
    name: 'Fire Tail Slap',
    cost: [CardType.FIRE, CardType.COLORLESS],
    damage: 40,
    text: 'Discard a [R] energy attached to this Pokemon.'
  }];

  public set: string = 'XY';
  public name: string = 'Braixen';
  public fullName: string = 'Braixen XY';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 3, sourceCard: this });

      return store.prompt(state, new OrderCardsPrompt(
        player.id,
        GameMessage.CHOOSE_CARDS_ORDER,
        deckTop,
        { allowCancel: false },
      ), order => {
        if (order === null) {
          return state;
        }

        deckTop.applyOrder(order);
        deckTop.moveToTopOfDestination(player.deck);

      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        checkProvidedEnergy.energyMap,
        [CardType.FIRE],
        { allowCancel: true }
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        if (cards.length > 0) {
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          return store.reduceEffect(state, discardEnergy);
        }
      });
    }

    return state;
  }
}