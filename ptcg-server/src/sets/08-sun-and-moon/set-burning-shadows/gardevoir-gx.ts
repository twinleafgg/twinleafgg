import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  CardTag,
  BoardEffect,
} from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  AttachEnergyPrompt,
  Card,
  ShuffleDeckPrompt,
  ChooseCardsPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {
  BLOCK_IF_DISCARD_EMPTY,
  BLOCK_IF_GX_ATTACK_USED,
  MOVE_CARDS,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

// BUS Gardevoir-GX 93 (https://limitlesstcg.com/cards/BUS/93)
export class GardevoirGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Kirlia';
  public cardType: CardType[] = [Y];
  public hp: number = 230;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Secret Spring',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may attach a [Y] Energy card from your hand to 1 of your Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Infinite Force',
      cost: [Y],
      damage: 30,
      damageCalculation: '+',
      text: 'This attack does 30 damage times the amount of Energy attached to both Active Pokémon.',
    },

    {
      name: 'Twilight-GX',
      cost: [Y],
      damage: 0,
      gxAttack: true,
      text: "Shuffle 10 cards from your discard pile into your deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'BUS';
  public name: string = 'Gardevoir-GX';
  public fullName: string = 'Gardevoir-GX BUS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';

  public readonly SPRING_MARKER = 'SPRING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.SPRING_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.SPRING_MARKER, this)
    ) {
      const player = effect.player;
      player.marker.removeMarker(this.SPRING_MARKER, this);
    }

    // Secret Spring
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInHand = player.hand.cards.some((c) => {
        return c.superType === SuperType.ENERGY && c.name === 'Fairy Energy';
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.SPRING_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, name: 'Fairy Energy' },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          player.marker.addMarker(this.SPRING_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, {
              cards: [transfer.card],
              sourceCard: this,
              sourceEffect: this.powers[0],
            });
          }
        },
      );
    }

    // Infinite Force
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, playerProvidedEnergy);
      const playerEnergyCount = playerProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      effect.damage = (playerEnergyCount + opponentEnergyCount) * 30;
    }

    // Twilight-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);

      BLOCK_IF_DISCARD_EMPTY(player);
      // set GX attack as used for game
      player.usedGX = true;

      let cards: Card[] = [];
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.discard,
          {},
          { min: 1, max: 10, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
        },
      );

      MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }
    return state;
  }
}
