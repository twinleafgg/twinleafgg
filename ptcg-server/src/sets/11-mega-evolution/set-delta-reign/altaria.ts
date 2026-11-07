import { CardType, PlayerType, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { IS_ABILITY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Altaria extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Swablu';
  public cardType: CardType[] = [C];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Cottony Carrier',
    powerType: PowerType.ABILITY,
    text: 'Your Basic Pokémon in play have no Retreat Cost.'
  }];

  public attacks = [{
    name: 'Flap',
    cost: [C, C, C],
    damage: 80,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Altaria';
  public fullName: string = 'Altaria M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cotton Carrier
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      let altariaInPlay = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          altariaInPlay = true;
        }
      });

      if (!altariaInPlay || IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const activePokemon = player.active.getPokemonCard();
      if (activePokemon && activePokemon.stage === Stage.BASIC) {
        effect.cost = [];
      }
    }

    return state;
  }
}