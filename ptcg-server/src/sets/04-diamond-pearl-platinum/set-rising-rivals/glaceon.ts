import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Glaceon extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Eevee';
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +20 }];
  public retreat = [C];

  public powers = [{
    name: 'Frost Wind',
    powerType: PowerType.POKEBODY,
    text: 'As long as Glaceon is your Active Pokémon, any damage done to your Pokémon by your opponent\'s attacks is reduced by 10 (after applying Weakness and Resistance).'
  }];

  public attacks = [{
    name: 'Ice Blade',
    cost: [W, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Ice Bind',
    cost: [W, C, C],
    damage: 50,
    text: 'If your opponent doesn\'t discard a card from his or her hand, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Glaceon';
  public fullName: string = 'Glaceon RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Frost Wind
    if (effect instanceof PutDamageEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (owner.active.getPokemonCard() !== this || effect.player === owner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      effect.reduceDamage(10);
    }

    // Ice Blade
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    // Ice Bind
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      if (opponent.hand.cards.length === 0) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        return state;
      }
      return CONFIRMATION_PROMPT(store, state, opponent, wantTo => {
        if (wantTo) {
          store.prompt(state, new ChooseCardsPrompt(
            opponent,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.hand,
            {},
            { min: 1, max: 1, allowCancel: false },
          ), cards => {
            MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards, sourceCard: this });
          });
        } else {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      }, GameMessage.WANT_TO_DISCARD_CARDS);
    }

    return state;
  }
}
