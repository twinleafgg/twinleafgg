import { GamePhase, PowerType, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { APPLY_SPECIAL_CONDITIONS_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { IS_ABILITY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';

export class Jellicent extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Frillish';
  protected _tags = [CardTag.TEAM_PLASMA];
  public cardType: CardType[] = [W];
  public hp: number = 100;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public powers = [{
    name: 'Spiteful Spirit',
    powerType: PowerType.ABILITY,
    text: "If this Pokémon is your Active Pokémon and is Knocked Out by damage from an opponent's attack, the Attacking Pokémon is now Confused and Poisoned.",
  }];

  public attacks = [{
    name: 'Aqua Bullet',
    cost: [W, C],
    damage: 40,
    text: "Does 10 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
  }];

  public set: string = 'PLS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Jellicent';
  public fullName: string = 'Jellicent PLS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Spiteful Spirit
    if (effect instanceof KnockOutEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.getOpponent(state, player);

      if (player.active !== effect.target) {
        return state;
      }

      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      if (state.players[state.activePlayer] !== opponent) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
        store,
        state,
        player,
        this.powers[0],
        this,
        opponent.active,
        [SpecialCondition.CONFUSED, SpecialCondition.POISONED],
      );
    }

    // Aqua Bullet
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(10, effect, store, state);
    }

    return state;
  }
}
