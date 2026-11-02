import { State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class SableyeG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [D];
  public weakness = [];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Scratch',
    cost: [],
    damage: 10,
    text: ''
  }, {
    name: 'Astonish',
    cost: [D, C],
    damage: 20,
    text: 'Choose 1 card from your opponent\'s hand without looking. Look at that card you chose, then have your opponent shuffle that card into his or her deck.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';
  public name: string = 'Sableye G';
  public fullName: string = 'Sableye G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Astonish
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.hand.cards.length === 0) {
        return state;
      }
      const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
      const randomCard = opponent.hand.cards[randomIndex];
      SHOW_CARDS_TO_PLAYER(store, state, player, [randomCard]);
      MOVE_CARDS(store, state, opponent.hand, opponent.deck, {
        cards: [randomCard],
        sourceCard: this,
        sourceEffect: this.attacks[1],
      });
      SHUFFLE_DECK(store, state, opponent);
    }

    return state;
  }
}
