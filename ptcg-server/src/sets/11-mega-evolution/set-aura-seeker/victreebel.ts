import { CardType, GameError, GameMessage, PokemonCard, PowerType, SpecialCondition, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { APPLY_SPECIAL_CONDITIONS_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import {
  ABILITY_USED,
  HEAL_X_DAMAGE_FROM_THIS_POKEMON,
  IS_ABILITY_BLOCKED,
  REMOVE_MARKER_AT_END_OF_TURN,
  USE_ABILITY_ONCE_PER_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class Victreebel extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Weepinbell';
  public hp: number = 150;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Acid Trap',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'If you have a Stadium in play, once during your turn, you may make your opponent\'s Active Pokémon Poisoned and Burned.'
  }];

  public attacks = [{
    name: 'Leaf Drain',
    cost: [G, G, C],
    damage: 120,
    text: 'Heal 30 damage from this Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Victreebel';
  public fullName: string = 'Victreebel FLO';

  public readonly ACID_TRAP_MARKER = 'ACID_TRAP_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Acid Trap
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (player.stadium.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ACID_TRAP_MARKER, this);
      ABILITY_USED(player, this);

      APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
        store,
        state,
        player,
        this.powers[0],
        this,
        opponent.active,
        [SpecialCondition.POISONED, SpecialCondition.BURNED],
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ACID_TRAP_MARKER, this);

    // Leaf Drain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 30);
    }

    return state;
  }
}
