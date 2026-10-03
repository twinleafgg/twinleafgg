import { Attack, CardList, CardType, PokemonCard, Stage, State, StoreLike, Weakness } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Onix extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 120;
  public weakness: Weakness[] = [{ type: G }];
  public retreat: CardType[] = [C, C, C, C];

  public attacks: Attack[] = [{
    name: 'Thumpalanche',
    cost: [C, C],
    damage: 80,
    damageCalculation: 'x',
    text: 'Discard the top 5 cards of your deck. This attack does 80 damage for each Pokémon with a Retreat Cost of exactly 4 that you discarded in this way.',
  },
  {
    name: 'Heavy Impact',
    cost: [F, F, C, C],
    damage: 100,
    text: ''
  }];

  public set: string = 'MEW';
  public regulationMark: string = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Onix';
  public fullName: string = 'Onix MEW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      const mistysPokemon = deckTop.cards.filter(c => c.retreat.length === 4);

      effect.damage = 80 * mistysPokemon.length;
      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });
    }

    return state;
  }
}