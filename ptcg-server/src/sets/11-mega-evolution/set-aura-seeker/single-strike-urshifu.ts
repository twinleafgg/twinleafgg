import {
  CardTag,
  CardType,
  ConfirmPrompt,
  GameMessage,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StoreLike,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON } from '../../../game/store/prefabs/costs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class SingleStrikeUrshifu extends PokemonCard {
  protected _tags = [CardTag.SINGLE_STRIKE];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Kubfu';
  public hp: number = 140;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Wicked Blow',
    cost: [F, F, C],
    damage: 120,
    damageCalculation: '+',
    text: 'You may discard a [D] Energy from this Pokémon. If you do, this attack does 140 more damage.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '49';
  public name: string = 'Single Strike Urshifu';
  public fullName: string = 'Single Strike Urshifu FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wicked Blow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      checkEnergy.source = effect.source;
      state = store.reduceEffect(state, checkEnergy);

      const hasDark = checkEnergy.energyMap.some(e =>
        e.provides.some((p: CardType) => p === CardType.DARK)
      );

      if (!hasDark) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_DISCARD_ENERGY),
        (confirm) => {
          if (confirm) {
            effect.damage += 140;
            return DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON(
              store,
              state,
              effect,
              1,
              CardType.DARK,
              1,
              [SlotType.ACTIVE],
            );
          }
        },
      );
    }

    return state;
  }
}
