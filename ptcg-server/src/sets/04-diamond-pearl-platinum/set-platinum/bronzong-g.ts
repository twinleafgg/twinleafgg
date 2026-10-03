import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  CardTarget,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';

export class BronzongG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public resistance = [{ type: R, value: -20 }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Galactic Switch',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may move an Energy card attached to 1 of your Pokémon SP to another of your Pokémon. Then, put 2 damage counters on Bronzong G. This power can't be used if Bronzong G is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Psychic Pulse',
      cost: [M, C, C],
      damage: 40,
      text: "Does 10 damage to each of your opponent's Benched Pokémon that has any damage counters on it. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Bronzong G';
  public fullName: string = 'Bronzong G PL';

  public readonly GALACTIC_SWITCH_MARKER = 'GALACTIC_SWITCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.GALACTIC_SWITCH_MARKER, this);
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.GALACTIC_SWITCH_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      let hasEnergy = false;
      let pokemonCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        pokemonCount += 1;
        // Only consider Pokémon SP for energy movement
        if (card.hasTag(CardTag.POKEMON_SP)) {
          const basicEnergyAttached = cardList.cards.some((c) => c.superType === SuperType.ENERGY);
          hasEnergy = hasEnergy || basicEnergyAttached;
        }
      });

      if (!hasEnergy || pokemonCount <= 1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Block all Pokémon whose tags don't include CardTag.POKEMON_SP as sources
      const blockedFrom: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (!card.hasTag(CardTag.POKEMON_SP)) {
          blockedFrom.push(target);
        }
      });

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false, blockedFrom },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            ADD_MARKER(this.GALACTIC_SWITCH_MARKER, player, this);
            ABILITY_USED(player, this);

            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
              if (cardList.getPokemonCard() === effect.card) {
                cardList.damage += 20; // Add 2 damage counters
              }
            });

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }

          return state;
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.GALACTIC_SWITCH_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const benched = opponent.bench.filter((b) => b.cards.length > 0);

      benched.forEach((target) => {
        if (target.damage !== 0) {
          const damageEffect = new PutDamageEffect(effect, 10);
          damageEffect.target = target;
          store.reduceEffect(state, damageEffect);
        }
      });
    }

    return state;
  }
}
