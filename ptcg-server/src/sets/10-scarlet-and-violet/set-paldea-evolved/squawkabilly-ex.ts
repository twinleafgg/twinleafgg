import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import { GameMessage } from '../../../game/game-message';
import {
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  PlayerType,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Squawkabillyex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [CardType.COLORLESS];
  public hp: number = 160;
  public weakness = [{ type: CardType.LIGHTNING }];
  public resistance = [{ type: CardType.FIGHTING, value: -30 }];
  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Squawk and Seize',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: "Once during your first turn, you may discard your hand and draw 6 cards. You can't use more than 1 Squawk and Seize Ability during your turn.",
    },
  ];

  public attacks = [
    {
      name: 'Motivate',
      cost: [CardType.COLORLESS],
      damage: 20,
      text: 'Attach up to 2 Basic Energy cards from your discard pile to 1 of your Benched Pokémon.',
    },
  ];

  public regulationMark = 'G';
  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '169';
  public name: string = 'Squawkabilly ex';
  public fullName: string = 'Squawkabilly ex PAL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      // Get current turn
      const turn = state.turn;

      // Check if it is player's first turn
      if (turn > 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.usedSquawkAndSeizeThisTurn) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      // Discard hand and draw cards
      MOVE_CARDS(store, state, player.hand, player.discard, { sourceCard: this });
      // Draw 6 cards
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 6, sourceCard: this });
      // Mark power as used this turn
      player.usedSquawkAndSeizeThisTurn = true;
      // Return updated state

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.getPokemonCard() === this) {
          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);
      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
      });

      if (!hasEnergyInDiscard) {
        return state;
      }

      if (!hasBench) {
        return state;
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: 2, sameTarget: true },
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

      return state;
    }
    return state;
  }
}
