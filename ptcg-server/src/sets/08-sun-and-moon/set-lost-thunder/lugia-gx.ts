import { PokemonCard, CardTag, Stage, CardType, StoreLike, State, StateUtils } from "../../../game";
import { CheckProvidedEnergyEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_ATTACK_USED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, BLOCK_IF_GX_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class LugiaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 190;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Psychic',
    cost: [C, C, C],
    damage: 30,
    text: 'This attack does 30 more damage times the amount of Energy attached to your opponent\'s Active Pokémon. '
  },
  {
    name: 'Pelagic Blade',
    cost: [C, C, C, C],
    damage: 170,
    text: 'This Pokémon can\'t attack during your next turn.'
  },
  {
    name: 'Lost Purge-GX',
    cost: [C, C, C],
    damage: 0,
    text: 'Put your opponent\'s Active Pokémon and all cards attached to it in the Lost Zone. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'LOT';
  public setNumber = '159';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Lugia-GX';
  public fullName: string = 'Lugia-GX LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psychic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      effect.damage += opponentEnergyCount * 30;
    }

    // Pelagic Blade
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    // Lost Purge-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      MOVE_CARDS(store, state, opponent.active, opponent.lostzone, { sourceCard: this });
      opponent.active.clearEffects();
    }

    return state;
  }
}
