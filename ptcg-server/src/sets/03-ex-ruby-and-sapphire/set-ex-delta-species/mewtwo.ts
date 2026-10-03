import { GameMessage } from '../../../game/game-message';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  PlayerType,
  SlotType,
  MoveEnergyPrompt,
  StateUtils,
  CardTarget,
  Card,
} from '../../../game';
import {IS_POKEPOWER_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Mewtwo extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R, M];
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp: number = 70;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [
    {
      name: 'Delta Switch',
      powerType: PowerType.POKEPOWER,
      text: 'Once during your turn, when you put Mewtwo from your hand onto your Bench, you may move any number of basic Energy cards attached to your Pokémon to your other Pokémon (excluding Mewtwo) in any way you like.',
    },
  ];

  public attacks = [
    {
      name: 'Energy Burst',
      cost: [R, M],
      damage: 10,
      damageCalculation: 'x',
      text: 'Does 10 damage times the total amount of Energy attached to Mewtwo and the Defending Pokémon.',
    },
  ];

  public set: string = 'DS';
  public name: string = 'Mewtwo';
  public fullName: string = 'Mewtwo DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card.name === this.name) {
          blockedTo.push(target);
        }
      });

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
          { allowCancel: false, blockedMap, blockedTo },
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

          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const playerCardList = player.active;
      const playerCheckProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, playerCardList);
      store.reduceEffect(state, playerCheckProvidedEnergyEffect);

      const opponent = effect.opponent;
      const opponentCardList = opponent.active;
      const opponentCheckProvidedEnergyEffect = new CheckProvidedEnergyEffect(
        opponent,
        opponentCardList,
      );
      store.reduceEffect(state, opponentCheckProvidedEnergyEffect);

      let energies: number = 0;
      playerCheckProvidedEnergyEffect.energyMap.forEach((energy) => {
        energy.provides.forEach((e) => {
          energies++;
        });
      });
      opponentCheckProvidedEnergyEffect.energyMap.forEach((energy) => {
        energy.provides.forEach((e) => {
          energies++;
        });
      });

      effect.damage = 10 * energies;
    }

    return state;
  }
}
