import {
  DiscardEnergyPrompt,
  GameError,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { CardList } from '../../../game/store/state/card-list';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Metagross extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Metang';
  protected _tags = [CardTag.DELTA_SPECIES];
  public cardType: CardType[] = [L, M];
  public hp: number = 100;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Delta Control',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may look at the top 4 cards of your deck, choose 1 of them, and put it into your hand. Put the 3 other cards on the bottom of your deck in any order. This power can't be used if Metagross is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Crush and Burn',
      cost: [L, M],
      damage: 30,
      damageCalculation: '+',
      text: 'You may discard as many Energy cards as you like attached to your Pokémon in play. If you do, this attack does 30 damage plus 20 more damage for each Energy card you discarded.',
    },
  ];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Metagross';
  public fullName: string = 'Metagross DS';

  public readonly DELTA_CONTROL_MARKER = 'DELTA_CONTROL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.DELTA_CONTROL_MARKER, this);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.DELTA_CONTROL_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const deckBottom = new CardList();
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 4, sourceCard: this });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          deckTop,
          {},
          { min: 1, max: 1, allowCancel: true },
        ),
        (selected) => {
          ADD_MARKER(this.DELTA_CONTROL_MARKER, player, this);
          ABILITY_USED(player, this);

          MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
          MOVE_CARDS(store, state, deckTop, deckBottom, { sourceCard: this });
          MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });
          return state;
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DELTA_CONTROL_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const energyCount = cardList.cards.filter(
          (card) => card.superType === SuperType.ENERGY,
        ).length;
        totalEnergy += energyCount;
      });

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { min: 1, max: totalEnergy, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            return state;
          }

          // Move all selected energies to discard
          transfers.forEach((transfer) => {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
          });

          // Set damage based on number of discarded cards
          effect.damage += transfers.length * 20;
          return state;
        },
      );
    }

    return state;
  }
}
