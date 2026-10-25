import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutAttackEffect } from '../../../game/store/effects/game-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { COIN_FLIP_PROMPT, DISCARD_TOP_X_OF_OPPONENTS_DECK, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Entei extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Burning Coat',
    powerType: PowerType.POKEBODY,
    text: 'Whenever 1 of your opponent\'s Pokémon is Knocked Out by damage from Entei\'s attacks, discard the top 3 cards from your opponent\'s deck.'
  }];

  public attacks = [{
    name: 'Blaze Roar',
    cost: [R, R, R],
    damage: 60,
    text: 'Does 20 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Flip a coin. If tails, discard 2 Fire Energy attached to Entei.'
  }];

  public set: string = 'SW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Entei';
  public fullName: string = 'Entei SW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Burning Coat
    if (effect instanceof KnockOutAttackEffect && effect.attack === this.attacks[0]) {
      if (!effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      const knockedOutOwner = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const enteiOwner = StateUtils.findOwner(state, cardList);

      if (knockedOutOwner === enteiOwner) {
        return state;
      }
      if (!StateUtils.isPokemonInPlay(enteiOwner, this)) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, enteiOwner, this)) {
        return state;
      }

      DISCARD_TOP_X_OF_OPPONENTS_DECK(store, state, enteiOwner, 3, this, this.powers[0]);
    }

    // Blaze Roar
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(20, effect, store, state);
      COIN_FLIP_PROMPT(store, state, effect.player, heads => {
        if (!heads) {
          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2, CardType.FIRE);
        }
      });
    }

    return state;
  }
}
