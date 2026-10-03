import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class TyranitarV extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  public regulationMark = 'E';

  protected _tags = [CardTag.POKEMON_V, CardTag.SINGLE_STRIKE];

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 230;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Cragalanche',
      cost: [CardType.DARK, CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: "Discard the top 2 cards of your opponent's deck.",
    },
    {
      name: 'Single Strike Crush',
      cost: [CardType.DARK, CardType.DARK, CardType.COLORLESS, CardType.COLORLESS],
      damage: 240,
      text: 'Discard the top 4 cards of your deck.',
    },
  ];

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '97';

  public name: string = 'Tyranitar V';

  public fullName: string = 'Tyranitar V BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard 2 cards from opponent's deck
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, {
        count: 2,
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Discard 4 cards from your deck
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 4, sourceCard: this });
      return state;
    }

    return state;
  }
}
