import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlaceDamageCountersEffect } from '../../../game/store/effects/game-effects';
import { DISCARD_TOP_X_OF_OPPONENTS_DECK, IS_ABILITY_BLOCKED, ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Sandslash extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Sandshrew';
  public cardType: CardType[] = [F];
  public hp: number = 110;
  public weakness = [{ type: G }];
  public retreat = [C];

  public powers = [{
    name: 'Counterattack Quills',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is in the Active Spot and is damaged by an attack from your opponent\'s Pokémon (even if this Pokémon is Knocked Out), place 3 damage counters on the Attacking Pokémon.'
  }];

  public attacks = [{
    name: 'Digging Claw',
    cost: [F],
    damage: 60,
    text: 'Discard the top card of your opponent\'s deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '50';
  public name: string = 'Sandslash';
  public fullName: string = 'Sandslash M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Counterattack Quills
    if (ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT(state, effect, { source: this })) {
      const abilityOwner = StateUtils.findOwner(state, effect.target);

      if (IS_ABILITY_BLOCKED(store, state, abilityOwner, this)) {
        return state;
      }

      const placeCounters = new PlaceDamageCountersEffect(
        abilityOwner,
        effect.source,
        30,
        this,
        this.powers[0],
      );
      store.reduceEffect(state, placeCounters);
    }

    // Digging Claw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_TOP_X_OF_OPPONENTS_DECK(store, state, effect.player, 1, this, effect);
    }

    return state;
  }
}
