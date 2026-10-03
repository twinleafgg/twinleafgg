import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  CardTag,
  EnergyType,
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
  EnergyCard,
  ShuffleDeckPrompt,
  ChooseCardsPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MetagrossGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Metang';
  public cardType: CardType[] = [M];
  public hp: number = 250;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Geotech System',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may attach a [P] or [M] Energy card from your discard pile to your Active Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Giga Hammer',
      cost: [CardType.METAL, CardType.METAL, CardType.COLORLESS],
      damage: 150,
      text: "This Pokémon can't use Giga Hammer during your next turn.",
    },

    {
      name: 'Algorithm-GX',
      cost: [CardType.COLORLESS],
      damage: 0,
      gxAttack: true,
      text: "Search your deck for up to 5 cards and put them into your hand. Then, shuffle your deck. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'GRI';
  public name: string = 'Metagross-GX';
  public fullName: string = 'Metagross-GX GRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';

  public readonly GEOTECH_MARKER = 'GEOTECH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.GEOTECH_MARKER, this);
    }

    // Geotech System
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          (c.provides.includes(CardType.PSYCHIC) || c.provides.includes(CardType.METAL))
        );
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.GEOTECH_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          {
            allowCancel: false,
            min: 1,
            max: 1,
            differentTypes: true,
            validCardTypes: [CardType.METAL, CardType.PSYCHIC],
          },
        ),
        (transfers) => {
          transfers = transfers || [];

          player.marker.addMarker(this.GEOTECH_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Giga Hammer
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[0]);
    }

    // Algorithm-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      if (player.deck.cards.length === 0) {
        return state;
      }

      let cards: Card[] = [];
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 1, max: 5, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
        },
      );

      MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.GEOTECH_MARKER, this);
    }
    return state;
  }
}
