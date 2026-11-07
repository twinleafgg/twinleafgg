import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MoveCardsEffect } from '../../../game/store/effects/game-effects';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { DRAW_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mantine extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Make Waves',
    cost: [C],
    damage: 0,
    text: 'Each player shuffles their hand into their deck and draws 4 cards..'
  },
  {
    name: 'Bubble Drain',
    cost: [W, C],
    damage: 30,
    text: 'Heal 30 damage from this Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Mantine';
  public fullName: string = 'Mantine M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Raising Waves
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.hand.cards.length > 0) {
        const playerMoveEffect = new MoveCardsEffect(player.hand, player.deck, {
          cards: player.hand.cards,
          sourceCard: this,
        });
        state = store.reduceEffect(state, playerMoveEffect);
      }

      if (opponent.hand.cards.length > 0) {
        const opponentMoveEffect = new MoveCardsEffect(opponent.hand, opponent.deck, { sourceCard: this });
        state = store.reduceEffect(state, opponentMoveEffect);
      }

      SHUFFLE_DECK(store, state, player);
      SHUFFLE_DECK(store, state, opponent);
      DRAW_CARDS(store, state, player, 4);
      DRAW_CARDS(store, state, opponent, 4);
    }

    // Bubble Drain
    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(30, effect, store, state);
    }

    return state;
  }
}
