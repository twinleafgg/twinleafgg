import {
  AttachEnergyPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {
  CardTag,
  CardType,
  EnergyType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED,
  ADD_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  SHUFFLE_DECK,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class StevensMetagrossex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = "Steven's Metang";
  protected _tags = [CardTag.STEVENS, CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 340;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'X-Boot',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text:
        'Once during your turn, you may search your deck for a Basic [P] Energy card, ' +
        'a Basic [M] Energy card, or 1 of each and attach them to your [P] Pokémon and [M] Pokémon ' +
        'in any way you like. Then, shuffle your deck.',
    },
  ];
  public attacks = [{ name: 'Metal Stomp', cost: [M, C, C], damage: 200, text: '' }];

  public regulationMark: string = 'I';
  public set: string = 'DRI';
  public setNumber: string = '145';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Steven's Metagross ex";
  public fullName: string = "Steven's Metagross ex DRI";

  public readonly X_BOOT_MARKER = 'X_BOOT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.X_BOOT_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.X_BOOT_MARKER, player, this);

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          {
            allowCancel: true,
            min: 0,
            max: 2,
            differentTypes: true,
            validCardTypes: [CardType.PSYCHIC, CardType.METAL],
          },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            if (transfers.length > 1) {
              if (transfers[0].card.name === transfers[1].card.name) {
                throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
              }
            }

            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.X_BOOT_MARKER, this);
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.X_BOOT_MARKER, this);
    }

    return state;
  }
}
