import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  EnergyType,
  SuperType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class StonjournerVMAX extends PokemonCard {
  public stage: Stage = Stage.VMAX;
  public evolvesFrom: string = 'Stonjourner V';
  protected _tags = [CardTag.POKEMON_VMAX];
  public cardType: CardType[] = [F];
  public hp: number = 330;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Stone Gift',
      cost: [F],
      damage: 0,
      text: 'Attach a [F] Energy card from your hand to 1 of your Pokémon. If you do, heal 120 damage from that Pokémon.',
    },
    {
      name: 'Max Rockfall',
      cost: [F, F, F],
      damage: 200,
      text: '',
    },
  ];

  public set: string = 'SSH';
  public regulationMark = 'D';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '116';
  public name: string = 'Stonjourner VMAX';
  public fullName: string = 'Stonjourner VMAX SSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { allowCancel: true, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            //Attaching energy
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });

            //Heal 30 from target
            const healEffect = new HealEffect(player, target, 120);
            state = store.reduceEffect(state, healEffect);
          }
        },
      );
    }

    return state;
  }
}
