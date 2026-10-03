import { PokemonCard, Stage, CardType, StoreLike, State, SuperType, ChooseCardsPrompt, GameMessage } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Mawile extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: M }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Double Eater',
    cost: [P, C],
    damage: 60,
    damageCalculation: 'x',
    text: 'Discard up to 2 Energy cards from your hand, and this attack does 60 damage for each card you discarded in this way.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Mawile';
  public fullName: string = 'Mawile M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Double Eater - discard energy from hand for damage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const energiesInHand = player.hand.cards.filter(card =>
        card.superType === SuperType.ENERGY
      );

      if (energiesInHand.length === 0) {
        effect.damage = 0;
        return state;
      }

      const maxToDiscard = Math.min(2, energiesInHand.length);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: maxToDiscard }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          const discardEffect = new DiscardCardsEffect(effect, cards);
          discardEffect.target = player.active;
          store.reduceEffect(state, discardEffect);
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        }
        effect.damage = cards.length * 60;
      });
    }

    return state;
  }
}
