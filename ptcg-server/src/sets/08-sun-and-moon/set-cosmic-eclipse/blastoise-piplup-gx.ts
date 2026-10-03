import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
  SpecialCondition,
} from '../../../game/store/card/card-types';
import {
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { HealTargetEffect } from '../../../game/store/effects/attack-effects';
import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class BlastoisePiplupGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public cardType: CardType[] = [W];
  public hp: number = 270;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Splash Maker',
      cost: [W, W, C],
      damage: 150,
      text: 'You may attach up to 3 [W] Energy cards from your hand to your Pokémon in any way you like. If you do, heal 50 damage from those Pokémon for each card you attached to them in this way.',
    },
    {
      name: 'Bubble Launcher-GX',
      cost: [W, W, C],
      damage: 100,
      damageCalculation: '+',
      text: "Your opponent's Active Pokémon is now Paralyzed. If this Pokémon has at least 3 extra [W] Energy attached to it (in addition to this attack's cost), this attack does 150 more damage. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Blastoise & Piplup-GX';
  public fullName: string = 'Blastoise & Piplup-GX CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Splash Maker
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { allowCancel: false, min: 0, max: 3 },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });

            const healing = new HealTargetEffect(effect, 50);
            healing.target = target;
            store.reduceEffect(state, healing);
          }
        },
      );
    }

    // Crimson Flame Pillar-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const opponent = StateUtils.getOpponent(state, player);
      opponent.active.addSpecialCondition(SpecialCondition.PARALYZED);

      // Check for the extra energy cost.
      const extraEffectCost: CardType[] = [W, W, W, W, W, C];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (!meetsExtraEffectCost) {
        return state;
      } // If we don't have the extra energy, we just deal damage.

      effect.damage += 150;
    }

    return state;
  }
}
