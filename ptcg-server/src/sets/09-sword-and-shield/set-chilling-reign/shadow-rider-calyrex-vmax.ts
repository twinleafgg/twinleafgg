import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import { StoreLike,
  State,
  GameMessage,
  GameError,
  PlayerType,
  SlotType,
  StateUtils,
  PowerType,
  AttachEnergyPrompt,
  EnergyCard, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ShadowRiderCalyrexVMAX extends PokemonCard {
  public stage: Stage = Stage.VMAX;
  public evolvesFrom = 'Shadow Rider Calyrex V';
  public regulationMark = 'E';
  public cardType: CardType[] = [P];
  protected _tags = [CardTag.POKEMON_VMAX];
  public hp: number = 320;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Underworld Door',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may attach a [P] Energy card from your hand to 1 of your Benched [P] Pokémon. If you attached Energy to a Pokémon in this way, draw 2 cards.',
    },
  ];

  public attacks = [
    {
      name: 'Max Geist',
      cost: [C, C, C],
      damage: 10,
      text: 'This attack does 30 more damage for each [P] Energy attached to all of your Pokémon.',
    },
  ];

  public set: string = 'CRE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '75';
  public name: string = 'Shadow Rider Calyrex VMAX';
  public fullName: string = 'Shadow Rider Calyrex VMAX CRE';
  public readonly UNDERWORLD_DOOR_MARKER = 'UNDERWORLD_DOOR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.UNDERWORLD_DOOR_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasBench = player.bench.some((b) => b.cards.length > 0);
      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      const hasEnergyInHand = player.hand.cards.some((c) => {
        return (
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.provides.includes(CardType.PSYCHIC)
        );
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.UNDERWORLD_DOOR_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const blocked: number[] = [];
      player.bench.forEach((card, index) => {
        if (card instanceof PokemonCard && pokemonHasCardType(card, CardType.PSYCHIC)) {
          blocked.push(index);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
          { allowCancel: true, min: 1, max: 1, blocked: blocked },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            player.marker.addMarker(this.UNDERWORLD_DOOR_MARKER, this);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
        },
      );
    }
    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.UNDERWORLD_DOOR_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.UNDERWORLD_DOOR_MARKER, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let energies = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach((energy) => {
          if (
            energy.provides.includes(CardType.PSYCHIC) ||
            energy.provides.includes(CardType.ANY)
          ) {
            energies++;
          }
        });
      });

      effect.damage = 10 + energies * 30;
    }

    return state;
  }
}
