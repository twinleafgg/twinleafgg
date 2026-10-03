import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
  PowerType,
  PlayerType,
  SlotType,
  GameError,
  ShowCardsPrompt,
  StateUtils,
} from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON } from '../../../game/store/prefabs/costs';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ChienPaoex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [W];
  public hp: number = 220;
  public weakness = [{ type: M }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Shivery Chill',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, if this Pokémon is in the Active Spot, you may search your deck for up to 2 Basic [W] Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Hail Blade',
      cost: [W, W],
      damage: 60,
      damageCalculation: 'x',
      text: 'You may discard any amount of [W] Energy from your Pokémon. This attack does 60 damage for each card you discarded in this way.',
    },
  ];

  public regulationMark = 'G';
  public set: string = 'PAL';
  public setNumber: string = '61';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Chien-Pao ex';
  public fullName: string = 'Chien-Pao ex PAL';

  public readonly SHIVERY_CHILL_MARKER = 'SHIVERY_CHILL_MARKER';

  // Implement power
  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.SHIVERY_CHILL_MARKER, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.SHIVERY_CHILL_MARKER, this);
    }

    if (effect instanceof PowerEffect && effect.power === this.powers[0]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.active.cards[0] !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.SHIVERY_CHILL_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { min: 0, max: 2, allowCancel: false },
        ),
        (cards) => {
          player.marker.addMarker(this.SHIVERY_CHILL_MARKER, this);

          if (cards.length === 0) {
            return state;
          }

          if (cards.length > 0) {
            state = store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => state,
            );
          }

          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }

            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = 0;

      // Legacy implementation:
      // - Counted only Basic Water Energy by name.
      // - Used DiscardEnergyPrompt on Active + Bench.
      // - Moved selected cards manually to discard.
      // - Set damage as discardedCount * 60.
      //
      // Converted to prefab version (DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON).
      return DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON(
        store,
        state,
        effect,
        Number.MAX_SAFE_INTEGER,
        CardType.WATER,
        0,
        [SlotType.ACTIVE, SlotType.BENCH],
        (transfers) => {
          effect.damage = transfers.length * 60;
        },
      );
    }
    return state;
  }
}
