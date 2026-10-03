import { CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_A_STADIUM_CARD_IN_PLAY } from '../../../game/store/prefabs/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Purugly extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Glameow';
  public cardType: CardType[] = [C];
  public hp: number = 110;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Own the Place',
    cost: [C],
    damage: 20,
    text: 'If your opponent has a Stadium card in play, discard it. If you do, prevent all effects of attacks, including damage, done to this Pokémon during your opponent\'s next turn.'
  },
  {
    name: 'Toss Aside',
    cost: [C, C, C],
    damage: 60,
    text: 'Discard random cards from your opponent\'s hand until they have 3 cards in their hand.'
  }];

  public set: string = 'UPR';
  public setNumber: string = '109';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Purugly';
  public fullName: string = 'Purugly UPR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Own the Place
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        DISCARD_A_STADIUM_CARD_IN_PLAY(state);
        PREVENT_DAMAGE(store, state, effect, this);
        PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
      }
    }

    // Toss Aside
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      while (opponent.hand.cards.length > 3) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const cardToDiscard = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [cardToDiscard], sourceCard: this });
      }
    }

    return state;
  }
}
