import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  DRAW_CARDS,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class EeveeSnorlaxGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 270;
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Cheer Up',
      cost: [C],
      damage: 0,
      text: 'Attach an Energy card from your hand to 1 of your Pokémon.',
    },
    {
      name: 'Dump Truck Press',
      cost: [C, C, C, C],
      damage: 120,
      damageCalculation: '+',
      text: "If your opponent's Active Pokémon is an Evolution Pokémon, this attack does 120 more damage.",
    },
    {
      name: 'Megaton Friends-GX',
      cost: [C, C, C, C],
      damage: 210,
      gxAttack: true,
      text: "If this Pokémon has at least 1 extra Energy attached to it (in addition to this attack's cost), draw cards until you have 10 cards in your hand. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set = 'TEU';
  public setNumber = '120';
  public cardImage = 'assets/cardback.png';
  public name = 'Eevee & Snorlax-GX';
  public fullName = 'Eevee & Snorlax-GX TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cheer Up
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Dump Truck Press
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;

      if (
        opponent.active.getPokemonCard()?.stage !== Stage.BASIC ||
        opponent.active.getPokemonCard()?.stage !== Stage.LEGEND ||
        opponent.active.getPokemonCard()?.stage !== Stage.VUNION
      ) {
        effect.damage += 120;
      }
    }

    // Megaton Friends-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const extraEffectCost: CardType[] = [C, C, C, C, C];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (meetsExtraEffectCost) {
        if (player.hand.cards.length > 10) {
          return state;
        }
        const cardsToDraw = 10 - player.hand.cards.length;

        for (let i = 0; i < cardsToDraw; i++) {
          DRAW_CARDS(store, state, player, 1);
        }
      }
    }

    return state;
  }
}
