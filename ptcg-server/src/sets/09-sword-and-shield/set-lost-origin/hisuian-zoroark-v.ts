import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, SWITCH_ACTIVE_WITH_BENCHED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianZoroarkV extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.POKEMON_V];

  public regulationMark = 'F';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 220;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Void Return',
      cost: [],
      damage: 30,
      text: 'You may switch this Pokémon with 1 of your Benched Pokémon.',
    },
    {
      name: 'Shadow Cyclone',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 130,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '146';

  public name: string = 'Hisuian Zoroark V';

  public fullName: string = 'Hisuian Zoroark V LOR';

  public usedVoidReturn: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedVoidReturn = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedVoidReturn) {
      const player = effect.player;
      SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
      this.usedVoidReturn = false;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);

      if (hasBench === false) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 1 },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }
    return state;
  }
}
