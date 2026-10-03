import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import {IS_POKEBODY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Shuckle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 60;
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Fermenting Liquid',
    powerType: PowerType.POKEBODY,
    text: 'Whenever you attach an Energy card from your hand to Shuckle, ' +
    'draw a card.'
  }];

  public attacks = [{
    name: 'Shell Stunner',
    cost: [G, C],
    damage: 20,
    text: 'Flip a coin. If heads, prevent all damage done to Shuckle by ' +
    'attacks during your opponent\'s next turn.'
  }];

  public set: string = 'HSP';
  public name: string = 'Shuckle';
  public fullName: string = 'Shuckle HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof AttachEnergyEffect && effect.target.cards.includes(this)) {
      const player = effect.player;
      const pokemonCard = effect.target.getPokemonCard();

      if (pokemonCard !== this) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      return FLIP_COIN_TO_PREVENT_DAMAGE_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }

}
