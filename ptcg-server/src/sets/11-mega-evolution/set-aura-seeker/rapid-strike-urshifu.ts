import { PokemonCard, CardTag, Stage, CardType, StoreLike, State, ConfirmPrompt, GameMessage, SlotType, StateUtils } from "../../../game";
import { PutDamageEffect } from "../../../game/store/effects/attack-effects";
import { CheckProvidedEnergyEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON } from "../../../game/store/prefabs/costs";
import { WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class RapidStrikeUrshifu extends PokemonCard {
  protected _tags = [CardTag.RAPID_STRIKE];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Kubfu';
  public hp: number = 140;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Torrential Strike',
    cost: [F, F, C],
    damage: 120,
    text: 'You may discard a [W] Energy from this Pokémon. If you do, this attack also does 40 damage to each of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Rapid Strike Urshifu';
  public fullName: string = 'Rapid Strike Urshifu FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Torrential Strike
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      checkEnergy.source = effect.source;
      state = store.reduceEffect(state, checkEnergy);

      const hasWater = checkEnergy.energyMap.some(e =>
        e.provides.some((p: CardType) => p === CardType.WATER)
      );

      if (!hasWater) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(player.id, GameMessage.WANT_TO_DISCARD_ENERGY),
        (confirm) => {
          if (confirm) {
            state = DISCARD_UP_TO_X_TYPE_ENERGY_FROM_YOUR_POKEMON(
              store,
              state,
              effect,
              1,
              CardType.WATER,
              1,
              [SlotType.ACTIVE],
            );

            const opponent = StateUtils.getOpponent(state, player);
            opponent.bench.forEach(benched => {
              if (benched.cards.length > 0) {
                const damage = new PutDamageEffect(effect, 40);
                damage.target = benched;
                store.reduceEffect(state, damage);
              }
            });
          }
        },
      );
    }

    return state;
  }
}
