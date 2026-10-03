import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  CardTag,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  EnergyCard,
  AttachEnergyPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LunalaPrismStar extends PokemonCard {
  protected _tags = [CardTag.PRISM_STAR];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 160;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Full Moon Star',
      cost: [P],
      damage: 0,
      text: "For each of your opponent's Pokémon in play, attach a [P] Energy card from your discard pile to your Pokémon in any way you like.",
    },

    {
      name: 'Psystorm',
      cost: [P, P, P, P],
      damage: 20,
      damageCalculation: 'x',
      text: 'This attack does 20 damage times the amount of Energy attached to all Pokémon.',
    },
  ];

  public set: string = 'UPR';
  public setNumber = '62';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Lunala Prism Star';
  public fullName: string = 'Lunala Prism Star UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Full Moon Star
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Psychic Energy'
        );
      });
      if (!hasEnergyInDiscard) {
        return state;
      }

      const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      if (benched === 0) {
        return state;
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: benched },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Psystorm
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let energies = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach((energy) => {
          energies += 1;
        });
      });

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(opponent, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach((energy) => {
          energies += 1;
        });
      });

      effect.damage = energies * 20;
    }

    return state;
  }
}
