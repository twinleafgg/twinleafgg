import { ConfirmPrompt, GameMessage, PokemonCard, State, StoreLike } from '../../../game';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Dialga extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 140;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Beam',
    cost: [M],
    damage: 30,
    text: '',
  },
  {
    name: 'Chrono Burst',
    cost: [M, M, C],
    damage: 80,
    damageCalculation: '+',
    text: 'You may shuffle all Energy attached to this Pokémon into your deck and have this attack do 80 more damage.',
  }];

  public regulationMark = 'I';
  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga MEG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Chrono Burst
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const cardList = player.active;

      const checkEnergy = new CheckProvidedEnergyEffect(player, cardList);
      state = store.reduceEffect(state, checkEnergy);

      const energyCards = checkEnergy.energyMap.map(em => em.card);
      if (energyCards.length === 0) {
        return state;
      }

      return store.prompt(state, new ConfirmPrompt(
        player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToShuffle => {
        if (wantToShuffle) {
          energyCards.forEach(card => {
            MOVE_CARDS(store, state, cardList, player.deck, { cards: [card], sourceCard: this });
          });
          SHUFFLE_DECK(store, state, player);
          effect.damage += 80;
        }
      });
    }

    return state;
  }
}
