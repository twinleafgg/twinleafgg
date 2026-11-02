import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_ATTACKS_COST_MORE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Igglybuff extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 30;
  public cardType: CardType[] = [C];
  public weakness = [];
  public retreat = [];

  public powers = [{
    name: 'Sweet Sleeping Face',
    powerType: PowerType.POKEBODY,
    text: 'As long as Igglybuff is Asleep, prevent all damage done to Igglybuff by attacks.'
  }];

  public attacks = [{
    name: 'Graffiti',
    cost: [],
    damage: 0,
    text: 'Igglybuff is now Asleep. During your opponent\'s next turn, the attack cost of each of the Defending Pokémon\'s attacks is Colorless more.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '44';
  public name: string = 'Igglybuff';
  public fullName: string = 'Igglybuff HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sweet Sleeping Face
    if (effect instanceof PutDamageEffect
      && effect.target.cards.includes(this)
      && effect.target.getPokemonCard() === this
      && effect.target.specialConditions.includes(SpecialCondition.ASLEEP)) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (!IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        effect.preventDefault = true;
      }
    }

    // Graffiti
    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.player, this);
      return DEFENDING_POKEMON_ATTACKS_COST_MORE(store, state, effect, 1);
    }

    return state;
  }
}
