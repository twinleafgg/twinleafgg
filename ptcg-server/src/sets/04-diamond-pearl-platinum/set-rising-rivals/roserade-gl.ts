import { CardTag, CardType, GameMessage, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED } from '../../../game/store/prefabs/attack-effects';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { CONFIRMATION_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RoseradeGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [{
    name: 'Poison Bind',
    cost: [C],
    damage: 10,
    text: 'The Defending Pokémon is now Poisoned and can\'t retreat during your opponent\'s next turn.'
  },
  {
    name: 'Long Whip',
    cost: [G, C],
    damage: 30,
    text: 'If the Defending Pokémon is affected by any Special Conditions, you may do 30 damage to any 1 Benched Pokémon instead. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Roserade GL';
  public fullName: string = 'Roserade GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Poison Bind
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_POISIONED(store, state, effect);
      return BLOCK_RETREAT(store, state, effect, this);
    }

    // Long Whip
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.active.specialConditions.length > 0 && opponent.bench.some(b => b.cards.length > 0)) {
        CONFIRMATION_PROMPT(store, state, player, wantToRedirect => {
          if (wantToRedirect) {
            effect.damage = 0;
            THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(30, effect, store, state);
          }
        }, GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK);
      }
    }

    return state;
  }
}
