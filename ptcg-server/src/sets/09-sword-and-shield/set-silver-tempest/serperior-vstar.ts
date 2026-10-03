import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  StoreLike,
  State,
  PlayerType,
  GameMessage,
  MoveEnergyPrompt,
  SlotType,
  StateUtils,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SerperiorVSTAR extends PokemonCard {
  public stage: Stage = Stage.VSTAR;

  public evolvesFrom = 'Serperior V';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 270;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [];

  protected _tags = [CardTag.POKEMON_VSTAR];

  public attacks = [
    {
      name: 'Regal Blender',
      cost: [CardType.GRASS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 190,
      text: 'You may move any amount of Energy from your Pokémon to your other Pokémon in any way you like.',
    },
    {
      name: 'Star Winder',
      cost: [CardType.GRASS],
      damage: 60,
      damageCalculation: 'x',
      text: "This attack does 60 damage for each Energy attached to this Pokémon. Switch this Pokémon with 1 of your Benched Pokémon. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public set: string = 'SIT';

  public regulationMark = 'F';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '8';

  public name: string = 'Serperior VSTAR';

  public fullName: string = 'Serperior VSTAR SIT 8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach((em) => {
        energyCount = em.card.superType;
      });
      effect.damage = energyCount * 60;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      // player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
      //   const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
      //   store.reduceEffect(state, checkProvidedEnergy);
      //   const blockedCards: Card[] = [];

      //   checkProvidedEnergy.energyMap.forEach(em => {
      //     if (em.provides.includes(CardType.ANY)) {
      //       blockedCards.push(em.card);
      //     }
      //   });

      //   const blocked: number[] = [];
      //   blockedCards.forEach(bc => {
      //     const index = cardList.cards.indexOf(bc);
      //     if (index !== -1 && !blocked.includes(index)) {
      //       blocked.push(index);
      //     }
      //   });

      //   if (blocked.length !== 0) {
      //     blockedMap.push({ source: target, blocked });
      //   }
      // });

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE], // Only allow moving to active
          { superType: SuperType.ENERGY },
          { min: 0, allowCancel: false },
        ),
        (transfers) => {
          if (!transfers) {
            return;
          }

          for (const transfer of transfers) {
            // Can only move energy to the active Pokemon
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }

          return state;
        },
      );
    }
    return state;
  }
}
