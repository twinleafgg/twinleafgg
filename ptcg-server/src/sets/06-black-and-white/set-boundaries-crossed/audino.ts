import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Audino extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Busybody',
    useFromHand: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pokémon is in your hand, you may reveal it. If you do, heal 10 damage and remove a Special Condition from your Active Pokémon. Then, discard this Pokémon.'
  }];

  public attacks = [
    {
      name: 'Hip Bump',
      cost: [C, C],
      damage: 30,
      text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
    }
  ];

  public set: string = 'BCR';
  public setNumber: string = '126';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Audino';
  public fullName: string = 'Audino BCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Busybody
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!(effect instanceof PowerEffect) || !player.hand.cards.includes(this)) {
        return state;
      }

      const healEffect = new HealEffect(player, player.active, 10);
      store.reduceEffect(state, healEffect);
      player.active.clearAllSpecialConditions();
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: [this], sourceCard: this });
    }
    // Hip Bump
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    return state;
  }
}
