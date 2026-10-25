import { GameMessage, PowerType, SelectPrompt, State, StoreLike } from '../../../game';
import { CardTag, CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ButterfreeFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [G];
  public hp: number = 90;
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Compound Eyes',
    powerType: PowerType.POKEBODY,
    text: 'If your opponent\'s Active Pokémon has any Poké-Bodies, each of Butterfree FB\'s attacks does 30 more damage to the Active Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Select Powder',
    cost: [G, C, C],
    damage: 30,
    text: 'Choose either Burned or Poisoned. The Defending Pokémon is now affected by that Special Condition.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Butterfree FB';
  public fullName: string = 'Butterfree FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Compound Eyes
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (!IS_POKEBODY_BLOCKED(store, state, player, this)) {
        const opponentActive = effect.opponent.active.getPokemonCard();
        if (opponentActive?.powers.some(power => power.powerType === PowerType.POKEBODY)) {
          effect.damage += 30;
        }
      }

      // Select Powder
      const options: { message: GameMessage, value: SpecialCondition }[] = [
        { message: GameMessage.SPECIAL_CONDITION_BURNED, value: SpecialCondition.BURNED },
        { message: GameMessage.SPECIAL_CONDITION_POISONED, value: SpecialCondition.POISONED },
      ];
      return store.prompt(state, new SelectPrompt(
        player.id,
        GameMessage.CHOOSE_SPECIAL_CONDITION,
        options.map(c => c.message),
        { allowCancel: false },
      ), choice => {
        const option = options[choice];
        if (option !== undefined) {
          const specialConditionEffect = new AddSpecialConditionsEffect(effect, [option.value]);
          store.reduceEffect(state, specialConditionEffect);
        }
      });
    }

    return state;
  }
}
