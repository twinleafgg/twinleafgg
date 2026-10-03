import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { StoreLike } from '../../../game/store/store-like';
import { GamePhase, State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  ShowCardsPrompt,
  StateUtils,
} from '../../../game';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {ABILITY_USED,
  ADD_MARKER,
  HAS_MARKER,
  REMOVE_OPPONENT_LAST_TURN_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Plusle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public hp: number = 60;
  public retreat = [C];

  public powers = [
    {
      name: 'Plus Charge',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), if any of your Pokémon were Knocked Out during your opponent's last turn, you may search your discard pile for up to 2 basic Energy cards, show them to your opponent, and put them into your hand. You can't use more than 1 Plus Charge Poké-Power each turn. This power can't be used if Plusle is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Tag Play +',
      cost: [L],
      damage: 20,
      text: "If you have Minun on your Bench, you may do 20 damage to any 1 Benched Pokémon instead. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'SW';
  public setNumber: string = '36';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Plusle';
  public fullName: string = 'Plusle SW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (!HAS_MARKER('OPPONENT_KNOCKOUT_MARKER', player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.usedPlusCharge == true) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Player has no Basic Energy in the discard pile
      let basicEnergyCards = 0;
      player.discard.cards.forEach((c) => {
        if (c instanceof EnergyCard && c.energyType === EnergyType.BASIC) {
          basicEnergyCards++;
        }
      });
      if (basicEnergyCards === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      player.usedPlusCharge = true;

      ABILITY_USED(player, this);

      const opponent = StateUtils.getOpponent(state, player);
      const min = Math.min(basicEnergyCards, 2);
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: min, max: min, allowCancel: false },
        ),
        (cards) => {
          cards = cards || [];

          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
            if (cards.length > 0) {
              state = store.prompt(
                state,
                new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                () => state,
              );
            }
          }

          if (cards.length > 0) {
            // Recover discarded Energy
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
          }
        },
      );
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
      player.usedPlusCharge = false;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let isMinunInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Minun') {
          isMinunInPlay = true;
        }
      });

      if (isMinunInPlay) {
        const player = effect.player;
        const hasBench = player.bench.some((b) => b.cards.length > 0);

        if (hasBench === false) {
          return state;
        }

        // Set the damage to 0
        effect.damage = 0;

        // Prompt asking which Pokémon to attack
        // (user can choose opponent's Active)
        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
            PlayerType.TOP_PLAYER,
            [SlotType.BENCH, SlotType.ACTIVE],
            { allowCancel: false },
          ),
          (targets) => {
            if (!targets || targets.length === 0) {
              return;
            }
            const damageEffect = new PutDamageEffect(effect, 20);
            damageEffect.target = targets[0];
            store.reduceEffect(state, damageEffect);
          },
        );
      }
      return state;
    }

    return state;
  }
}
