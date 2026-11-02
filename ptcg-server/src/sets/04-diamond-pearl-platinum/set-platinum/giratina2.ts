import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Giratina2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Over Slash',
    cost: [C, C],
    damage: 0,
    text: 'This attack does 10 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon).'
  }, {
    name: 'Dark Wing Flaps',
    cost: [P, P],
    damage: 20,
    text: 'Choose 1 card from your opponent\'s hand without looking. Look at the card you chose, then have your opponent shuffle that card into his or her deck.'
  }, {
    name: 'Wrack Down',
    cost: [P, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina PL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Over Slash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_EACH_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    // Dark Wing Flaps
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.hand.cards.length === 0) {
        return state;
      }
      const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
      const randomCard = opponent.hand.cards[randomIndex];
      SHOW_CARDS_TO_PLAYER(store, state, player, [randomCard]);
      MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: [randomCard], sourceEffect: this.attacks[1] });
      SHUFFLE_DECK(store, state, opponent);
    }

    return state;
  }
}
