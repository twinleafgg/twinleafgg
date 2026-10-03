import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  Card,
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
  HAS_MARKER,
  REMOVE_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Gardevoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kirlia';
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp = 100;
  public cardType: CardType[] = [P, M];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Energy Jump',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may move an Energy card attached to 1 of your Pokémon to another of your Pokémon. This power can't be used if Gardevoir is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Psychic Rage',
      cost: [M, C],
      damage: 0,
      text: "Choose 1 of your opponent's Pokémon. This attack does 10 damage for each damage counter on Gardevoir to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Black Magic',
      cost: [P, C, C],
      damage: 10,
      damageCalculation: '+',
      text: "Does 10 damage plus 20 more damage times the number of your opponent's Benched Pokémon.",
    },
  ];

  public set: string = 'DS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '6';

  public name: string = 'Gardevoir';

  public fullName: string = 'Gardevoir DS';

  public readonly ENERGY_JUMP_MARKER = 'ENERGY_JUMP_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.ENERGY_JUMP_MARKER, effect.player, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (HAS_MARKER(this.ENERGY_JUMP_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        const blockedCards: Card[] = [];
        checkProvidedEnergy.energyMap.forEach((em) => {
          if (em.provides.length === 0) {
            blockedCards.push(em.card);
          }
        });

        const blocked: number[] = [];
        blockedCards.forEach((bc) => {
          const index = cardList.cards.indexOf(bc);
          if (index !== -1 && !blocked.includes(index)) {
            blocked.push(index);
          }
        });

        if (blocked.length !== 0) {
          blockedMap.push({ source: target, blocked });
        }
      });

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          {},
          { min: 1, max: 1, allowCancel: false, blockedMap },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            ADD_MARKER(this.ENERGY_JUMP_MARKER, player, this);
            ABILITY_USED(player, this);

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);

            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }

          return state;
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ENERGY_JUMP_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(
        effect.player.active.damage,
        effect,
        store,
        state,
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      //Get number of benched pokemon
      const opponentBenched = opponent.bench.reduce(
        (left, b) => left + (b.cards.length ? 1 : 0),
        0,
      );
      const totalBenched = opponentBenched;

      effect.damage += totalBenched * 20;
    }

    return state;
  }
}
