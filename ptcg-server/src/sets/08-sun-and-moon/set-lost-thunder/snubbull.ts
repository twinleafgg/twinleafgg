import { CardType, PokemonCard, Stage, StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Snubbull extends PokemonCard {
  public stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp = 70;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Make a Mess',
    cost: [Y],
    damage: 20,
    damageCalculation: 'x',
    text: 'Discard up to 2 Trainer cards from your hand. This attack does 20 damage for each card you discarded in this way.'
  }];

  public set: string = 'LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '137';

  public name = 'Snubbull';

  public fullName: string = 'Snubbull LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hand = player.hand;

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        hand,
        {},
        { min: 0, max: 2, allowCancel: false }
      ), selected => {
        const discardCount = selected || [];

        // Operation canceled by the user
        if (discardCount.length === 0) {
          return state;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: discardCount, sourceCard: this });
        effect.damage = 20 * discardCount.length;
      });
    }
    return state;
  }
}