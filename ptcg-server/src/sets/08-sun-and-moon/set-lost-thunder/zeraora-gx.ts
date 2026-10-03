import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckProvidedEnergyEffect,
  CheckRetreatCostEffect,
} from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ZeraoraGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_GX];
  public cardType: CardType[] = [L];
  public hp: number = 190;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Thunderclap Zone',
      powerType: PowerType.ABILITY,
      text: 'Each of your Pokémon that has any [L] Energy attached to it has no Retreat Cost.',
    },
  ];

  public attacks = [
    {
      name: 'Plasma Fists',
      cost: [L, L, C],
      damage: 160,
      text: "This Pokémon can't attack during your next turn.",
    },
    {
      name: 'Full Voltage-GX',
      cost: [L],
      damage: 0,
      text: "Attach 5 basic Energy cards from your discard pile to your Pokémon in any way you like. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set = 'LOT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '201';
  public name = 'Zeraora-GX';
  public fullName = 'Zeraora GX LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      let isZeraoraGXInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isZeraoraGXInPlay = true;
        }
      });

      if (!isZeraoraGXInPlay) {
        return state;
      }

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);

      checkProvidedEnergy.energyMap.forEach((energy) => {
        if (energy.provides.includes(L)) {
          effect.cost = [];
          return state;
        }

        if (energy.provides.includes(CardType.ANY)) {
          effect.cost = [];
          return state;
        }
      });
    }

    // Plasma Fists
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          (c as EnergyCard).provides.includes(L)
        );
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: true, min: 1, max: 5 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
