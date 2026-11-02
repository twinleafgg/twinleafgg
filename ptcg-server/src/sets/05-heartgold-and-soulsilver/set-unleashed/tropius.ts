import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MULTIPLE_COIN_FLIPS_PROMPT, SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Tropius extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Green Call',
    cost: [G],
    damage: 0,
    text: 'Flip 2 coins. For each heads, search your deck for a Grass Pokémon, show it to your opponent, and put it into your hand. If you do, shuffle your deck afterward.'
  },
  {
    name: 'Gust',
    cost: [G, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Tropius';
  public fullName: string = 'Tropius UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Green Call
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        const heads = results.filter(r => r).length;
        if (heads === 0) {
          return;
        }
        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (!(card instanceof PokemonCard) || !card.cardType.includes(CardType.GRASS)) {
            blocked.push(index);
          }
        });
        SEARCH_DECK_FOR_CARDS_TO_HAND(
          store,
          state,
          player,
          this,
          { superType: SuperType.POKEMON },
          { min: 0, max: heads, allowCancel: true, blocked }
        );
      });
    }

    return state;
  }
}
