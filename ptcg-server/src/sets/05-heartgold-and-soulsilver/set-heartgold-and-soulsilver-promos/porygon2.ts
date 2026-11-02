import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_POKEBODY_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Porygon2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Porygon';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Shortcut',
    powerType: PowerType.POKEBODY,
    text: 'The Retreat Cost for each Porygon, Porygon2, and Porygon-Z you have in play is Colorless less.'
  }];

  public attacks = [{
    name: 'Reckless Charge',
    cost: [C, C, C],
    damage: 50,
    text: 'Porygon2 does 10 damage to itself.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Porygon2';
  public fullName: string = 'Porygon2 HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shortcut
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      if (!StateUtils.isPokemonInPlay(player, this)) {
        return state;
      }

      const retreating = player.active.getPokemonCard();
      if (!retreating || !['Porygon', 'Porygon2', 'Porygon-Z'].includes(retreating.name)) {
        return state;
      }

      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const shortcutCards: PokemonCard[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card.powers.some(power => power.name === 'Shortcut')) {
          shortcutCards.push(card);
        }
      });
      if (shortcutCards[0] !== this) {
        return state;
      }

      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (index !== -1) {
        effect.cost.splice(index, 1);
      }
    }

    // Reckless Charge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
    }

    return state;
  }
}
