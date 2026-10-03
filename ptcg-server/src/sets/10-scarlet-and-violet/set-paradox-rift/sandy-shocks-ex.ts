import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, CardTag, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import {
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SandyShocksex extends PokemonCard {
  public stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex, CardTag.ANCIENT];
  public cardType: CardType[] = [F];
  public hp = 220;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Magnetic Absorption',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, if your opponent has 4 or fewer Prize cards remaining, you may attach a Basic [F] Energy card from your discard pile to this Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Earthen Spike',
      cost: [F, F, C],
      damage: 200,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark = 'G';
  public set: string = 'PAR';
  public setNumber: string = '108';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sandy Shocks ex';
  public fullName: string = 'Sandy Shocks ex PAR';

  public readonly MAGNETIC_ABSORPTION_MARKER = 'MAGNETIC_ABSORPTION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.MAGNETIC_ABSORPTION_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.MAGNETIC_ABSORPTION_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.MAGNETIC_ABSORPTION_MARKER, this);
      console.log('marker cleared');
    }

    // Earthen Spike
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const prizes = opponent.getPrizeLeft();

      if (player.marker.hasMarker(this.MAGNETIC_ABSORPTION_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (prizes > 4) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.name == 'Fighting Energy';
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
            player.marker.addMarker(this.MAGNETIC_ABSORPTION_MARKER, this);
          }
          return state;
        },
      );
      return state;
    }

    return state;
  }
}
