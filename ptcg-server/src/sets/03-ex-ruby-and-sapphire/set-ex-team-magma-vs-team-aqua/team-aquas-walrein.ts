import {
  CardTarget,
  DiscardEnergyPrompt,
  GameError,
  GameMessage,
  PlayerType,
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
import { EnergyCard } from '../../../game/store/card/energy-card';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamAquasWalrein extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = "Team Aqua's Sealeo";
  protected _tags = [CardTag.TEAM_AQUA];
  public cardType: CardType[] = [W, D];
  public hp: number = 120;
  public weakness = [{ type: F }, { type: M }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Power Blow',
      cost: [W],
      damage: 10,
      damageCalculation: '+',
      text: "Does 10 damage plus 10 more damage for each Energy attached to Team Aqua's Walrein.",
    },
    {
      name: 'Hydro Reverse',
      cost: [W, W, C, C],
      damage: 50,
      damageCalculation: '+',
      text: 'You may return any number of basic [W] Energy cards attached to all of your Pokémon to your hand. If you do, this attack does 50 damage plus 10 more damage for each Energy you returned.',
    },
  ];

  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = "Team Aqua's Walrein";
  public fullName: string = "Team Aqua's Walrein MA";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = player.active;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energies: number = 0;
      checkProvidedEnergyEffect.energyMap.forEach((energy) => {
        energy.provides.forEach((e) => {
          energies++;
        });
      });
      effect.damage += 10 * energies;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      let availableTypedEnergy = 0;
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard, target) => {
        const blocked: number[] = [];
        let energyIndex = 0;
        cardList.cards.forEach((card) => {
          if (card.superType !== SuperType.ENERGY) {
            return;
          }
          const isBasicWater =
            card instanceof EnergyCard &&
            card.energyType === EnergyType.BASIC &&
            card.provides.includes(CardType.WATER);
          if (!isBasicWater) {
            blocked.push(energyIndex);
          } else {
            availableTypedEnergy += 1;
          }
          energyIndex++;
        });
        blockedMap.push({ source: target, blocked });
      });

      if (availableTypedEnergy === 0) {
        return state;
      }

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_HAND,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { allowCancel: false, blockedMap },
        ),
        (transfers) => {
          if (transfers === null || transfers.length === 0) {
            return state;
          }

          for (const transfer of transfers) {
            const card = transfer.card;
            if (!(card instanceof EnergyCard) || !card.provides.includes(CardType.WATER)) {
              throw new GameError(GameMessage.INVALID_PROMPT_RESULT);
            }
          }

          transfers.forEach((transfer) => {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.hand, { cards: [transfer.card], sourceCard: this });
          });

          effect.damage += 10 * transfers.length;
          return state;
        },
      );
    }

    return state;
  }
}
