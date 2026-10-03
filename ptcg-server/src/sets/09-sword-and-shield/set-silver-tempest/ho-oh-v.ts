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
  CardTarget,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HoOhV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];
  public regulationMark = 'F';
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.COLORLESS];
  public hp: number = 230;
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Reviving Flame',
      useFromDiscard: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, if this Pokémon is in your discard pile, you may put it onto your Bench. If you do, attach up to 4 basic Energy cards from your discard pile to this Pokémon. If you use this Ability, your turn ends.',
    },
  ];

  public attacks = [
    {
      name: 'Rainbow Burn',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 100,
      damageCalculation: '+',
      text: 'This attack does 30 more damage for each type of basic Energy attached to this Pokémon.',
    },
  ];

  public set: string = 'SIT';
  public name: string = 'Ho-Oh V';
  public fullName: string = 'Ho-Oh V SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '140';

  public readonly NETHERWORLD_GATE_MARKER = 'NETHERWORLD_GATE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      // Check if card is in the discard
      if (!player.discard.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Power already used
      if (player.marker.hasMarker(this.NETHERWORLD_GATE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // No open slots, throw error
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      // Add Marker
      player.marker.addMarker(this.NETHERWORLD_GATE_MARKER, this);

      const cards = player.discard.cards.filter((c) => c === this);
      cards.forEach((card, index) => {
        MOVE_CARDS(store, state, player.discard, slots[index], { cards: [card], sourceCard: this });
      });

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
      });
      if (!hasEnergyInDiscard) {
        return state;
      }

      let hasDarkraiGXOnBench = false;
      const blockedTo: CardTarget[] = [];
      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        const pokemonCard = bench.getPokemonCard();
        if (pokemonCard instanceof HoOhV) {
          hasDarkraiGXOnBench = true;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      if (hasDarkraiGXOnBench) {
        state = store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_BENCH,
            player.discard,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.BENCH],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { allowCancel: false, min: 0, max: 4, blockedTo },
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

            const endTurnEffect = new EndTurnEffect(player);
            store.reduceEffect(state, endTurnEffect);
            return state;
          },
        );
      }
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.NETHERWORLD_GATE_MARKER, this);
    }
    return state;
  }
}
