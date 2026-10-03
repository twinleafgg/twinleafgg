import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
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
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TerrakionEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 180;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Rock Tumble',
      cost: [F, C],
      damage: 50,
      text: "This attack's damage isn't affected by Resistance.",
    },
    {
      name: 'Pump-up Smash',
      cost: [F, F, C],
      damage: 90,
      text: 'Attach 2 basic Energy cards from your hand to your Benched Pokemon in any way you like.',
    },
  ];

  public set: string = 'DRX';
  public setNumber: string = '71';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Terrakion-EX';
  public fullName: string = 'Terrakion-EX DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Rock Tumble - ignore Resistance
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    // Attack 2: Pump-up Smash - Attach 2 basic Energy from hand to bench
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const hasBasicEnergy = player.hand.cards.some(
        (c) => c instanceof EnergyCard && c.energyType === EnergyType.BASIC,
      );

      if (!hasBasicEnergy) {
        return state;
      }

      const hasBenched = player.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      const availableCount = player.hand.cards.filter(
        (c) => c instanceof EnergyCard && c.energyType === EnergyType.BASIC,
      ).length;
      const count = Math.min(2, availableCount);

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: count, max: count },
        ),
        (transfers) => {
          if (transfers) {
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
            }
          }
        },
      );
    }

    return state;
  }
}
