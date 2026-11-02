import { CardTag, CardType, GameMessage, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, IS_POKEBODY_BLOCKED, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class QuagsireGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Submerge',
    powerType: PowerType.POKEBODY,
    text: 'As long as Quagsire GL is on your Bench, prevent all damage done to Quagsire GL by attacks (both yours and your opponent\'s).'
  }];

  public attacks = [{
    name: 'Punch and Run',
    cost: [W, C, C],
    damage: 40,
    text: 'You may switch Quagsire GL with 1 of your Benched Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Quagsire GL';
  public fullName: string = 'Quagsire GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Submerge
    if ((effect instanceof PutDamageEffect || effect instanceof DealDamageEffect) && effect.target.getPokemonCard() === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (effect.target === owner.active || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      effect.preventDefault = true;
      return state;
    }

    // Punch and Run
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.bench.some(b => b.cards.length > 0)) {
        CONFIRMATION_PROMPT(store, state, player, wantToSwitch => {
          if (wantToSwitch) {
            SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
          }
        }, GameMessage.WANT_TO_SWITCH_POKEMON);
      }
    }

    return state;
  }
}
