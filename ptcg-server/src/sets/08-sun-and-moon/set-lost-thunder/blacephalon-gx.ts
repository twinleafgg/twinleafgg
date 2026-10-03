import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SpecialCondition,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  CardList,
  ChoosePrizePrompt,
  DiscardEnergyPrompt,
} from '../../../game';
import { StoreLike, State, GameMessage, PlayerType, SlotType, EnergyCard } from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';

import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BlacephalonGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.ULTRA_BEAST];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 180;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Bursting Burn',
      cost: [CardType.FIRE],
      damage: 0,
      text: "Your opponent's Active Pokémon is now Burned and Confused.",
    },

    {
      name: 'Mind Blown',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 50,
      text: 'Put any amount of [R] Energy attached to your Pokémon in the Lost Zone. This attack does 50 damage for each card put in the Lost Zone in this way.',
    },

    {
      name: 'Burst-GX',
      cost: [CardType.FIRE],
      damage: 0,
      text: "Discard 1 of your Prize cards. If it's an Energy card, attach it to 1 of your Pokémon. (You can't use more than 1 GX attack in a game.)",
    },
  ];
  public set: string = 'LOT';

  public name: string = 'Blacephalon-GX';

  public fullName: string = 'Blacephalon-GX LOT';

  public regulationMark = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '52';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Bursting Burn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const specialCondition = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.CONFUSED,
        SpecialCondition.BURNED,
      ]);
      return store.reduceEffect(state, specialCondition);
    }

    // Mind Blown
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let totalFireEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const fireCount = cardList.cards.filter(
          (card) => card instanceof EnergyCard && card.name === 'Fire Energy',
        ).length;
        totalFireEnergy += fireCount;
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH], // Card source is target Pokemon
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { min: 1, max: totalFireEnergy, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            let totalDiscarded = 0;

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = player.lostzone;
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });

            totalDiscarded = transfers.length;

            effect.damage = totalDiscarded * 50;
          }

          return state;
        },
      );
    }

    // Burst-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      return store.prompt(
        state,
        new ChoosePrizePrompt(player.id, GameMessage.CHOOSE_PRIZE_CARD, {
          count: 1,
          allowCancel: false,
        }),
        (prizes) => {
          const holdingZone = new CardList();
          MOVE_CARDS(store, state, prizes[0], holdingZone, { sourceCard: this });

          const discardedEnergy = holdingZone.cards.filter((card) => {
            return card instanceof EnergyCard;
          });

          if (discardedEnergy.length == 0) {
            MOVE_CARDS(store, state, holdingZone, player.discard, { sourceCard: this });
          }

          if (discardedEnergy.length > 0) {
            store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_TO_BENCH,
                holdingZone,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                { superType: SuperType.ENERGY },
                { allowCancel: false, min: 1, max: 1 },
              ),
              (transfers) => {
                transfers = transfers || [];
                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, holdingZone, target, { cards: [transfer.card], sourceCard: this });
                }
              },
            );
          }
        },
      );
    }
    return state;
  }
}
