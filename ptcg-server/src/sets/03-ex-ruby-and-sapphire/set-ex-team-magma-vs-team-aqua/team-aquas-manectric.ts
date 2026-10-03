import {
  Card,
  CardTarget,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamAquasManectric extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = "Team Aqua's Electrike";
  protected _tags = [CardTag.TEAM_AQUA];
  public cardType: CardType[] = [L, D];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Power Shift',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), you may move any number of basic Energy cards attached to 1 of your Pokémon with Team Aqua in its name to another of your Pokémon. This power can't be used if Team Aqua's Manectric is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Thunderspark',
      cost: [L, C, C],
      damage: 50,
      text: "Does 10 damage to each Benched Pokémon (both yours and your opponent's) that has Energy cards attached to it. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = "Team Aqua's Manectric";
  public fullName: string = "Team Aqua's Manectric MA";

  public readonly POWER_SHIFT_MARKER = 'POWER_SHIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (HAS_MARKER(this.POWER_SHIFT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.POWER_SHIFT_MARKER, player, this);

      const blockedFrom: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (!cardList.getPokemonCard()?.hasTag(CardTag.TEAM_AQUA)) {
          blockedFrom.push(target);
        }
      });

      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        const blockedCards: Card[] = [];
        checkProvidedEnergy.energyMap.forEach((em) => {
          if (em.card.energyType !== EnergyType.BASIC) {
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

      store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          {},
          { allowCancel: true, blockedMap, blockedFrom },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_SHIFT_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      // Check both players' Pokémon for Poké-Powers/Bodies
      [player, opponent].forEach((currentPlayer) => {
        // Check bench Pokémon
        currentPlayer.bench.forEach((bench) => {
          if (bench) {
            // Check if energy attached
            const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(currentPlayer, bench);
            store.reduceEffect(state, checkProvidedEnergyEffect);

            if (checkProvidedEnergyEffect.energyMap.length > 0) {
              // Apply damage to Pokémon
              const damageEffect = new PutDamageEffect(effect, 10);
              damageEffect.target = bench;
              store.reduceEffect(state, damageEffect);
            }
          }
        });
      });
    }

    return state;
  }
}
