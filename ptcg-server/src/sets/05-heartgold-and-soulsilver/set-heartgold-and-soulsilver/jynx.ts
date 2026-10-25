import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, SHUFFLE_HAND_INTO_DECK_THEN_DRAW, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';

export class Jynx extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Mimic',
    cost: [C],
    damage: 0,
    text: 'Shuffle your hand into your deck. Then, draw a number of cards equal to the number of cards in your opponent\'s hand.'
  },
  {
    name: 'Lick',
    cost: [P, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '69';
  public name: string = 'Jynx';
  public fullName: string = 'Jynx HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mimic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      return SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, {
        sourceCard: this,
        drawCount: opponent.hand.cards.length,
      });
    }

    // Lick
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}
