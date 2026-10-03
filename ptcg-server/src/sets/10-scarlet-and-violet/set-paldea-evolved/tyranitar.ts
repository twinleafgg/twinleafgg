import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tyranitar extends PokemonCard {
  public regulationMark = 'G';
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Pupitar';
  public cardType: CardType[] = [D];
  public hp: number = 180;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Rout',
      cost: [D],
      damage: 30,
      damageCalculation: '+',
      text: 'This attack does 30 more damage for each of your opponent\'s Benched Pokémon.'
    },
    {
      name: 'Dread Mountain',
      cost: [D, D],
      damage: 230,
      text: 'Discard the top 4 cards of your deck.'
    }
  ];

  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '135';
  public name: string = 'Tyranitar';
  public fullName: string = 'Tyranitar PAL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rout
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;

      const opponentBenched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      effect.damage += opponentBenched * 30;
    }

    // Dread Mountain
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MOVE_CARDS(store, state, effect.player.deck, effect.player.discard, { count: 4, sourceCard: this });
    }

    return state;
  }
}
