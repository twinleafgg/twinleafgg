import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Kabuto extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Dome Fossil';
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Fast Evolution',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Evolution cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Speed Attack',
    cost: [F, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Kabuto';
  public fullName: string = 'Kabuto AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fast Evolution
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const blocked: number[] = [];
      effect.player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.evolvesFrom !== '' && card.stage !== Stage.LV_X) {
          return;
        }
        blocked.push(index);
      });
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        effect.player,
        {},
        { min: 0, max: 2, allowCancel: false, blocked }
      );
    }

    return state;
  }
}
