import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import { DiscardEnergyPrompt, GameMessage, PlayerType, SlotType, StateUtils } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Scizorex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom = 'Scyther';
  public cardType: CardType[] = [M];
  public hp: number = 270;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Steel Wing',
      cost: [C, C],
      damage: 70,
      text: "During your opponent's next turn, this Pokémon takes 50 less damage from attacks (after applying Weakness and Resistance).",
    },
    {
      name: 'Cross Breaker',
      cost: [M, M],
      damage: 120,
      damageCalculation: 'x',
      text: 'Discard up to 2 [M] Energy from this Pokémon. This attack does 120 damage for each card you discarded in this way.',
    },
  ];

  public set: string = 'TEF';
  public name: string = 'Scizor ex';
  public fullName: string = 'Scizor ex TEF';
  public setNumber: string = '111';
  public regulationMark: string = 'H';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = 50;
    }

    // Cross Breaker
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE], // Card source is target Pokemon
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
          { min: 0, max: 2, allowCancel: false },
        ),
        (transfers) => {
          if (transfers === null) {
            effect.damage = 0;
            return;
          }

          if (transfers.length === 0) {
            effect.damage = 0;
            return state;
          }

          for (const transfer of transfers) {
            let totalDiscarded = 0;

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = player.discard;
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });

            totalDiscarded = transfers.length;

            effect.damage = totalDiscarded * 120;
          }
          return state;
        },
      );
    }

    return state;
  }
}
