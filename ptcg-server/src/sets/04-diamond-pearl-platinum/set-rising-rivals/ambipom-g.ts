import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PlayerType,
  AttachEnergyPrompt,
  GameMessage,
  SlotType,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {CONFIRMATION_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class AmbipomG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [C];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Tail Code',
      cost: [C],
      damage: 0,
      text: "Move an Energy card attached to the Defending Pokémon to another of your opponent's Pokémon.",
    },
    {
      name: 'Snap Attack',
      cost: [C, C],
      damage: 60,
      text: "If the Defending Pokémon has any Energy cards attached to it, this attack's base damage is 20 instead of 60.",
    },
  ];

  public set: string = 'RR';
  public setNumber: string = '56';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Ambipom G';
  public fullName: string = 'Ambipom G RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Jamming Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      CONFIRMATION_PROMPT(store, state, player, (result) => {
        if (result) {
          if (!opponent.bench.some((b) => b.cards.length > 0)) {
            return state;
          }

          let energyCount = 0;
          opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
            const hasEnergy = new CheckProvidedEnergyEffect(opponent, cardList);
            store.reduceEffect(state, hasEnergy);

            if (hasEnergy.energyMap.length > 0) {
              energyCount += hasEnergy.energyMap.length;
            }
          });

          if (energyCount === 0) {
            return state;
          }

          return store.prompt(
            state,
            new AttachEnergyPrompt(
              player.id,
              GameMessage.MOVE_ENERGY_CARDS,
              opponent.active.energies,
              PlayerType.TOP_PLAYER,
              [SlotType.BENCH],
              { superType: SuperType.ENERGY },
              { allowCancel: false, min: 1, max: 1 },
            ),
            (transfers) => {
              transfers = transfers || [];
              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, opponent, transfer.to);
                MOVE_CARDS(store, state, opponent.active, target, { cards: [transfer.card], sourceCard: this });
              }
            },
          );
        }
      });
    }

    // Snap Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      const opponentActive = opponent.active;

      const hasEnergy = new CheckProvidedEnergyEffect(opponent, opponentActive);
      store.reduceEffect(state, hasEnergy);

      if (hasEnergy.energyMap.length > 0) {
        effect.damage = 20;
      }
    }

    return state;
  }
}
