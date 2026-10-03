import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  AttachEnergyPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED,
  ADD_MARKER,
  HAS_MARKER,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Minun extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public hp: number = 60;
  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Minus Charge',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), if any Pokémon were Knocked Out during your opponent's last turn, you may draw 2 cards. You can't use more than 1 Minus Charge Poké-Power each turn. This power can't be used if Minun is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Tag Play -',
      cost: [L],
      damage: 20,
      text: 'If you have Plusle on your Bench, you may move an Energy card attached to Minun to 1 of your Benched Pokémon.',
    },
  ];

  public set: string = 'SW';
  public setNumber: string = '32';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Minun';
  public fullName: string = 'Minun SW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!HAS_MARKER('OPPONENT_KNOCKOUT_MARKER', player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.usedMinusCharge == true) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      player.usedMinusCharge = true;

      ABILITY_USED(player, this);
    }

    if (effect instanceof KnockOutEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK || state.players[state.activePlayer] !== opponent) {
        return state;
      }

      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner === player) {
        ADD_MARKER('OPPONENT_KNOCKOUT_MARKER', player, this);
      }
      return state;
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner === player) {
        REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN(effect, 'OPPONENT_KNOCKOUT_MARKER', this);
      }
      player.usedMinusCharge = false;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let isPlusleInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Plusle') {
          isPlusleInPlay = true;
        }
      });

      if (isPlusleInPlay) {
        const player = effect.player;
        const hasBench = player.bench.some((b) => b.cards.length > 0);

        if (hasBench === false) {
          return state;
        }

        // Then prompt for energy movement
        return store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.active,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY },
            { allowCancel: false, min: 0, max: 1 },
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

    return state;
  }
}
