import { ChooseCardsPrompt, GameMessage, TrainerCard } from '../../../game';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class Morpeko extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 80;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Gather Food',
    cost: [C],
    damage: 0,
    text: 'Put an Item card from your discard pile into your hand.'
  }, {
    name: 'Hangry Tackle',
    cost: [D],
    damage: 20,
    damageCalculation: '+',
    text: 'If you have no cards in your hand, this attack does 90 more damage.'
  }];

  public regulationMark = 'E';

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '98';

  public name: string = 'Morpeko';

  public fullName: string = 'Morpeko BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const itemCount = player.discard.cards.filter(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.ITEM;
      }).length;

      if (itemCount === 0) {
        return state;
      }

      const max = Math.min(1, itemCount);
      const min = max;

      return store.prompt(state, [
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
          { min, max, allowCancel: false }
        )], selected => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
          });
        });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.hand.cards.length === 0) {
        effect.damage += 90;
      }
    }

    return state;
  }
}