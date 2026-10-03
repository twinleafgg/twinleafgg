import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StoreLike,
  State,
  StateUtils,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  SlotType,
} from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';

export class Keldeo extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 110;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Shoot THrough',
      cost: [W],
      damage: 20,
      text: "This attack also does 20 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Reflect Energy',
      cost: [W, W],
      damage: 70,
      text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '19';
  public name: string = 'Keldeo';
  public fullName: string = 'Keldeo M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some((b) => b.cards.length > 0);
      if (hasBench) {
        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
            PlayerType.TOP_PLAYER,
            [SlotType.BENCH],
            { min: 1, max: 1, allowCancel: false },
          ),
          (selected) => {
            const targets = selected || [];
            if (targets.length > 0) {
              const benchTarget = targets[0];
              const putDamage = new PutDamageEffect(effect, 20);
              putDamage.target = benchTarget;
              store.reduceEffect(state, putDamage);
            }
          },
        );
      }
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasBench = player.bench.some((b) => b.cards.length > 0);
      const hasEnergy = player.active.cards.some((c) => c.superType === SuperType.ENERGY);
      if (hasBench && hasEnergy) {
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
            const list = transfers || [];
            for (const t of list) {
              const target = StateUtils.getTarget(state, player, t.to);
              MOVE_CARDS(store, state, player.active, target, { cards: [t.card], sourceCard: this });
            }
          },
        );
      }
    }
    return state;
  }
}
