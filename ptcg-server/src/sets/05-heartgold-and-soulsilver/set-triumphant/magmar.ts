import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { StoreLike, State, StateUtils, CardType, Stage, SuperType, CardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magmar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 70;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Eruption',
    cost: [R],
    damage: 20,
    damageCalculation: 'x',
    text: 'Each player discards the top card of his or her deck. This attack does 20 damage times the number of Energy cards discarded in this way.'
  },
  {
    name: 'Combustion',
    cost: [R, C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'TM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '42';
  public name: string = 'Magmar';
  public fullName: string = 'Magmar TM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Ground Burn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerTopDeck = new CardList();
      const opponentTopDeck = new CardList();
      let damageScaling = 0;

      MOVE_CARDS(store, state, player.deck, playerTopDeck, { count: 1, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponentTopDeck, { count: 1, sourceCard: this });

      if (playerTopDeck.cards[0]?.superType === SuperType.ENERGY) {
        damageScaling++;
      }
      if (opponentTopDeck.cards[0]?.superType === SuperType.ENERGY) {
        damageScaling++;
      }

      effect.damage = 20 * damageScaling;

      MOVE_CARDS(store, state, playerTopDeck, player.discard, { sourceCard: this });
      MOVE_CARDS(store, state, opponentTopDeck, opponent.discard, { sourceCard: this });
    }

    return state;
  }
}