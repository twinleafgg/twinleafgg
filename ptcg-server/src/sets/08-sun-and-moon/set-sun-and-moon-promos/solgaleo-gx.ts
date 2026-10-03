import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../..';
import { Effect, HealEffect } from '../../../game/store/effects/game-effects';
import {BLOCK_IF_GX_ATTACK_USED, IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckPokemonStatsEffect } from '../../../game/store/effects/check-effects';

export class SolgaleoGX extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Cosmoem';
  public cardType: CardType[] = [CardType.METAL];
  public hp: number = 250;
  public weakness = [{ type: CardType.FIRE }];
  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Shining Mane',
    powerType: PowerType.ABILITY,
    text: 'Your Pokémon in play have no Weakness.'
  }];

  public attacks = [{
    name: 'Turbo Strike',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 120,
    text: 'Attach 2 basic Energy cards from your discard pile to 1 of your Benched Pokémon.'
  },
  {
    name: 'Prominence-GX',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 0,
    gxAttack: true,
    text: 'Heal all damage from all of your Pokémon. (You can\'t use more than 1 GX attack in a game.)'
  }
  ];

  public set: string = 'SMP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '104';
  public name: string = 'Solgaleo-GX';
  public fullName: string = 'Solgaleo-GX SMP';
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof CheckPokemonStatsEffect) {
      const player = StateUtils.findOwner(state, effect.target);

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      let isSolgaleoInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isSolgaleoInPlay = true;
        }
      });

      if (isSolgaleoInPlay) {
        effect.weakness = [];
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);
      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c.superType === SuperType.ENERGY
          && c.energyType === EnergyType.BASIC;
      });

      if (!hasEnergyInDiscard) {
        return state;
      }

      if (!hasBench) {
        return state;
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { allowCancel: false, min: 2, max: 2, sameTarget: true }
      ), transfers => {
        transfers = transfers || [];

        if (transfers.length === 0) {
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const healEffect = new HealEffect(player, cardList, cardList.damage);
        state = store.reduceEffect(state, healEffect);
      });
    }

    return state;
  }
}
