import { CardList, CardType, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Hatterene extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Hattrem';
  public hp: number = 150;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Psybeam',
    cost: [P],
    damage: 40,
    text: 'Your opponent\'s Active Pokémon is now Confused.'
  },
  {
    name: 'Magic Tentacle',
    cost: [P, P],
    damage: 100,
    damageCalculation: '+',
    text: 'Discard the top card of each player\'s deck, and this attack does 100 more damage for each Trainer card discarded in this way.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Hatterene';
  public fullName: string = 'Hatterene FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psybeam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
    }

    // Magic Tentacle
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerTopDeck = new CardList();
      const opponentTopDeck = new CardList();
      let trainerCount = 0;

      if (player.deck.cards.length > 0) {
        MOVE_CARDS(store, state, player.deck, playerTopDeck, { count: 1, sourceCard: this });
      }
      if (opponent.deck.cards.length > 0) {
        MOVE_CARDS(store, state, opponent.deck, opponentTopDeck, { count: 1, sourceCard: this });
      }

      if (playerTopDeck.cards[0]?.superType === SuperType.TRAINER) {
        trainerCount++;
      }
      if (opponentTopDeck.cards[0]?.superType === SuperType.TRAINER) {
        trainerCount++;
      }

      effect.damage += 100 * trainerCount;

      MOVE_CARDS(store, state, playerTopDeck, player.discard, { sourceCard: this });
      MOVE_CARDS(store, state, opponentTopDeck, opponent.discard, { sourceCard: this });
    }

    return state;
  }
}
