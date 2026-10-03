import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../game/store/card/card-types';
import {
  StoreLike,
  State,
  EnergyCard,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import {THIS_POKEMON_DOES_DAMAGE_TO_ITSELF,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';

export class RocketsZapdos extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.ROCKETS];
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Plasma',
      cost: [L],
      damage: 20,
      text: "If there are any [L] Energy cards in your discard pile, attach 1 of them to Rocket's Zapdos.",
    },
    {
      name: 'Electroburn',
      cost: [L, L, L, C],
      damage: 70,
      text: "Rocket's Zapdos does damage to itself equal to 10 times the number of [L] Energy cards attached to it.",
    },
  ];

  public set: string = 'G2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = "Rocket's Zapdos";
  public fullName: string = "Rocket's Zapdos G2";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (
        player.discard.cards.some(
          (card) => card instanceof EnergyCard && card.name === 'Lightning Energy',
        )
      ) {
        state = store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_TO_ACTIVE,
            player.discard,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE],
            { superType: SuperType.ENERGY, name: 'Lightning Energy' },
            { allowCancel: false, min: 1, max: 1 },
          ),
          (transfers) => {
            transfers = transfers || [];
            // cancelled by user
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
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkProvided = new CheckProvidedEnergyEffect(effect.player, effect.player.active!);
      store.reduceEffect(state, checkProvided);
      const lightningCount = checkProvided.energyMap.filter((e) =>
        e.provides.includes(CardType.LIGHTNING),
      ).length;
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10 * lightningCount);
    }

    return state;
  }
}
