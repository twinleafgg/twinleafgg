import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  StateUtils,
  PokemonCardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EffectOfAbilityEffect } from '../../../game/store/effects/game-effects';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  CAN_APPLY_LOCK_TO_TARGET,
  HANDLE_ABILITY_LOCK,
  IS_ABILITY_LOCKER_ACTIVE,
  LOCKER_ABILITY_APPLIES,
} from '../../../game/store/prefabs/ability-lock';

export class IronThornsex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex, CardTag.FUTURE];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 230;
  public weakness = [{ type: F }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Initialization',
      powerType: PowerType.ABILITY,
      abilityLock: true,
      exemptFromInitialize: true,
      text: "As long as this Pokémon is in the Active Spot, Pokémon with a Rule Box in play (both yours and your opponent's) have no Abilities, except for Future Pokémon. (Pokémon ex, Pokémon V, etc. have Rule Boxes.)",
    },
  ];

  public attacks = [
    {
      name: 'Volt Cyclone',
      cost: [L, C, C],
      damage: 140,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public regulationMark = 'H';
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = 'Iron Thorns ex';
  public fullName: string = 'Iron Thorns ex TWM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof EffectOfAbilityEffect &&
      effect.card === this &&
      effect.power === this.powers[0]
    ) {
      const targetCard = effect.target?.getPokemonCard();
      if (targetCard?.hasTag(CardTag.FUTURE)) {
        effect.target = undefined;
      }
    }

    HANDLE_ABILITY_LOCK(
      effect,
      ({ player, card, powerEffect }) => {
        if (!IS_ABILITY_LOCKER_ACTIVE(state, player, this)) {
          return false;
        }

        try {
          const targetCardList = StateUtils.findCardList(state, card);
          if (!(targetCardList instanceof PokemonCardList)) {
            return false;
          }
        } catch {
          return false;
        }

        if (card.hasTag(CardTag.FUTURE) || !card.hasRuleBox()) {
          return false;
        }

        const opponent = StateUtils.getOpponent(state, player);
        const lockerOwner = player.active.getPokemonCard() === this ? player : opponent;

        // Check + PowerEffect: Initialization must itself be usable (e.g. Path to the Peak).
        if (!LOCKER_ABILITY_APPLIES(store, state, lockerOwner, this, this.powers[0], card)) {
          return false;
        }
        if (powerEffect) {
          return CAN_APPLY_LOCK_TO_TARGET(store, state, lockerOwner, this, this.powers[0], card);
        }
        return true;
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
        respectExemptFromInitialize: true,
        error: GameMessage.BLOCKED_BY_ABILITY,
      },
    );

    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
