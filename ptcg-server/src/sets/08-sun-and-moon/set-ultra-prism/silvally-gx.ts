import {
  PokemonCard,
  Stage,
  CardType,
  State,
  StoreLike,
  PowerType,
  CardTag,
  StateUtils,
  PlayerType,
  GameError,
  GameMessage,
  SuperType,
  EnergyCard,
  EnergyType,
  AttachEnergyPrompt,
  SlotType,
} from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SilvallyGX extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Type: Null';
  protected _tags = [CardTag.POKEMON_GX];
  public cardType: CardType[] = [C];
  public hp: number = 210;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Gyro Unit',
      powerType: PowerType.ABILITY,
      text: 'Your Basic Pokémon in play have no Retreat Cost.',
    },
  ];

  public attacks = [
    {
      name: 'Turbo Drive',
      cost: [C, C, C],
      damage: 120,
      text: 'Attach a basic Energy card from your discard pile to 1 of your Benched Pokémon.',
    },
    {
      name: 'Rebel-GX',
      cost: [C, C, C],
      damage: 50,
      damageCalculation: 'x',
      text: "This attack does 50 damage for each of your opponent's Benched Pokémon. (You can't use more than 1 GX attack in a game.)",
      gxAttack: true,
    },
  ];

  public set: string = 'UPR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '116';
  public name: string = 'Silvally-GX';
  public fullName: string = 'Silvally-GX UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gyro Unit
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      const active = effect.player.active.getPokemonCard();

      if (owner !== player || active === undefined) {
        return state;
      }

      let isSilvallyGXInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          isSilvallyGXInPlay = true;
        }
      });

      if (!isSilvallyGXInPlay) {
        return state;
      }

      if (!IS_ABILITY_BLOCKED(store, state, player, this) && active.stage === Stage.BASIC) {
        effect.cost = [];
      }
      return state;
    }

    // Turbo Drive
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }

      let energyInDiscard = false;
      player.discard.cards.forEach((card) => {
        if (card instanceof EnergyCard && card.energyType === EnergyType.BASIC) {
          energyInDiscard = true;
        }
      });
      if (!energyInDiscard) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
          return state;
        },
      );
    }

    // Rebel-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      if (player.usedGX) {
        throw new GameError(GameMessage.LABEL_GX_USED);
      }
      player.usedGX = true;

      let benchedPokemon = 0;
      opponent.bench.forEach((slot) => {
        if (slot.cards.length > 0) {
          benchedPokemon++;
        }
      });

      effect.damage = benchedPokemon * 50;
    }

    return state;
  }
}
