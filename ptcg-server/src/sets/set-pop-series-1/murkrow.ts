import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardType } from '../../game';
import { SpecialCondition } from '../../game';
import { PowerType } from '../../game';
import { State } from '../../game';
import { StateUtils } from '../../game';
import { StoreLike } from '../../game';
import { PokemonCardList } from '../../game';
import { ChoosePokemonPrompt } from '../../game';
import { GameMessage } from '../../game';
import { PlayerType } from '../../game';
import { SlotType } from '../../game';
import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { AddSpecialConditionsEffect } from '../../game/store/effects/attack-effects';
import { AddSpecialConditionsPowerEffect } from '../../game/store/effects/check-effects';
import { CheckTableStateEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Murkrow extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public powers = [{
    // Insomnia
    name: 'Insomnia',
    powerType: PowerType.POKEBODY,
    text: 'Murkrow can\'t be Asleep.'
  }];

  public attacks = [{
    // Feint Attack
    name: 'Feint Attack',
    cost: [C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 20 damage to that Pokémon. This attack\'s damage isn\'t affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on that Pokémon.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Murkrow';
  public fullName: string = 'Murkrow P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Insomnia
    if (
      (effect instanceof AddSpecialConditionsEffect || effect instanceof AddSpecialConditionsPowerEffect) &&
      effect.target.getPokemonCard() === this
    ) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        effect.specialConditions = effect.specialConditions.filter(sc => sc !== SpecialCondition.ASLEEP);
        if (effect.specialConditions.length === 0) {
          effect.preventDefault = true;
        }
      }
    }

    if (effect instanceof CheckTableStateEffect) {
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const owner = StateUtils.findOwner(state, cardList);
      if (StateUtils.isPokemonInPlay(owner, this) && cardList.getPokemonCard() === this) {
        if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
          cardList.removeSpecialCondition(SpecialCondition.ASLEEP);
        }
      }
    }

    // Feint Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.getPokemonInPlay().length === 0) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        target.damage += 20;
        const afterDamage = new AfterDamageEffect(effect, 20);
        afterDamage.target = target;
        store.reduceEffect(state, afterDamage);
      });
    }

    return state;
  }
}
