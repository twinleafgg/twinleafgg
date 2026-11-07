import { CardType, PlayerType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_ABILITY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Hawlucha extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C];

  public powers = [{
    name: 'Overflowing Cheer',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is in play, the Energy required for your Pokémon to use the Guts Fight attack is reduced by [C].'
  }];

  public attacks = [{
    name: 'Jab',
    cost: [F, C],
    damage: 40,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Hawlucha';
  public fullName: string = 'Hawlucha FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Overflowing Cheer
    // Ref: set-surging-sparks/grapploct.ts (CheckAttackCostEffect cost reduction)
    if (effect instanceof CheckAttackCostEffect && effect.attack.name === 'Guts Fight') {
      const player = effect.player;

      let hawluchaInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          hawluchaInPlay = true;
        }
      });

      if (!hawluchaInPlay || IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const index = effect.cost.indexOf(C);
      if (index !== -1) {
        effect.cost.splice(index, 1);
      }
    }

    return state;
  }
}
