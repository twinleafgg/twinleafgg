import {
  CardTag,
  CardTarget,
  CardType,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { MovedToActiveEffect, PowerEffect } from '../../../game/store/effects/game-effects';
import {MOVED_TO_ACTIVE_THIS_TURN,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class WyrdeerV extends PokemonCard {
  public cardType: CardType[] = [CardType.COLORLESS];

  protected _tags = [CardTag.POKEMON_V];

  public hp = 220;

  public stage = Stage.BASIC;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Frontier Road',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when this Pokémon moves from your Bench to the Active Spot, you may move any amount of Energy from your other Pokémon to it.',
    },
  ];

  public attacks = [
    {
      name: 'Psyshield Bash',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 40,
      damageCalculation: 'x',
      text: 'This attack does 40 damage for each Energy attached to this Pokémon.',
    },
  ];

  public regulationMark = 'F';

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '134';

  public name: string = 'Wyrdeer V';

  public fullName: string = 'Wyrdeer V ASR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

    const player = state.players[state.activePlayer];
    if (
      effect instanceof MovedToActiveEffect &&
      effect.pokemonCard === this &&
      state.players[state.activePlayer] === effect.player &&
      MOVED_TO_ACTIVE_THIS_TURN(effect.player, this)
    ) {
      if (player.marker.hasMarker(this.ABILITY_USED_MARKER, this)) {
        return state;
      }

      try {
        const stub = new PowerEffect(
          player,
          {
            name: 'test',
            powerType: PowerType.ABILITY,
            text: '',
          },
          this,
        );
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];

      let hasEnergyOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          blockedFrom.push(target);
          return;
        }
        blockedTo.push(target);
        if (cardList.cards.some((c) => c.superType === SuperType.ENERGY)) {
          hasEnergyOnBench = true;
        }
      });

      if (hasEnergyOnBench === false) {
        return state;
      }

      player.marker.addMarker(this.ABILITY_USED_MARKER, this);

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, blockedTo: blockedTo, blockedFrom: blockedFrom },
        ),
        (transfers) => {
          if (!transfers) {
            return;
          }

          for (const transfer of transfers) {
            const target = player.active;
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let totalDamage = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        checkProvidedEnergy.energyMap.forEach((em) => {
          em.provides.forEach((energyType) => {
            if (energyType !== CardType.ANY) {
              totalDamage += 40;
            }
          });
        });
      });

      effect.damage = totalDamage;
    }
    return state;
  }
}
