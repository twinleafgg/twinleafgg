import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, HEAL_X_DAMAGE_FROM_THIS_POKEMON, SHUFFLE_DECK, SHOW_CARDS_TO_PLAYER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
export class Mawile extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Astonish',
    cost: [M],
    damage: 0,
    text: 'Flip a coin. If heads, choose a random card from your opponent\'s hand. Your opponent reveals that card and shuffles it into his or her deck.'
  }, {
    name: 'Big Ol\' Bite',
    cost: [M, C, C],
    damage: 30,
    text: 'Heal 30 damage from this Pokémon. The Defending Pokémon can\'t retreat during your opponent\'s next turn.'
  }];

  public set: string = 'PLF';
  public setNumber: string = '80';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mawile';
  public fullName: string = 'Mawile PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Astonish
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result && opponent.hand.cards.length > 0) {
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const randomCard = opponent.hand.cards[randomIndex];
          SHOW_CARDS_TO_PLAYER(store, state, player, [randomCard]);
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: [randomCard], sourceCard: this });
          SHUFFLE_DECK(store, state, opponent);
        }
      });
    }

    // Attack 2: Big Ol' Bite
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 30);
      BLOCK_RETREAT(store, state, effect, this);
    }
    return state;
  }
}
