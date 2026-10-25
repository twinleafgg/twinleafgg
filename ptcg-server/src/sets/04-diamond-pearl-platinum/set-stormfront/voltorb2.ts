import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { EnergyCard } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_DOES_DAMAGE_TO_ITSELF } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Voltorb2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    // Outlet
    name: 'Outlet',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a Lightning Energy card, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    // Bouncing Ball
    name: 'Bouncing Ball',
    cost: [L],
    damage: 20,
    text: 'Flip a coin. If tails, Voltorb does 10 damage to itself.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Voltorb';
  public fullName: string = 'Voltorb SF2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Outlet
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const blocked: number[] = [];
      effect.player.deck.cards.forEach((card, index) => {
        if (!(card instanceof EnergyCard) || !card.provides.includes(L)) {
          blocked.push(index);
        }
      });
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        effect.player,
        this,
        { superType: SuperType.ENERGY },
        { min: 0, max: 1, allowCancel: true, blocked }
      );
    }

    // Bouncing Ball
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 10);
        }
      });
    }

    return state;
  }
}
