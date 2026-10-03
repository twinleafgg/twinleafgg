import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';

import { Effect } from '../../game/store/effects/effect';
import { ChooseCardsPrompt, GameMessage, StateUtils } from '../../game';
import { DiscardCardsEffect } from '../../game/store/effects/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';

export class Moltres extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 70;
  public weakness = [];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Wildfire',
    cost: [R],
    damage: 0,
    text: 'You may discard any number of [R] Energy cards attached to Moltres when you use this attack. If you do, discard that many cards from the top of your opponent\'s deck.'
  }, {
    name: 'Dive Bomb',
    cost: [R, R, R, R],
    damage: 80,
    text: 'Flip a coin. If tails, this attack does nothing.'
  }];

  public set: string = 'FO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres FO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const active = player.active;

      // Filter metal energies from the active Pokémon
      const energies = active.cards.filter(card =>
        card.superType === SuperType.ENERGY
      ).length;

      const min = 1;
      const max = energies;

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        active,
        { superType: SuperType.ENERGY },
        { min: min, max: max, allowCancel: false }
      ), energy => {
        const discardEnergy = new DiscardCardsEffect(effect, energy);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);

        state = MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: energy.length });
        // MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: energy.length, sourceCard: this });
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result === false) {
          effect.damage = 0;
        }
      });
    }
    return state;
  }
}
