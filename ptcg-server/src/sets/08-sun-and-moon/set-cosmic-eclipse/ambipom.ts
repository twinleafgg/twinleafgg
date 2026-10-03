import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ambipom extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Aipom';
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Nice-Nice Catch',
    cost: [C],
    damage: 0,
    text: 'Draw 2 cards.'
  }, {
    name: 'Bye-Bye Throw',
    cost: [C, C],
    damage: 0,
    text: 'Discard up to 2 cards from your hand. This attack does 60 damage for each card you discarded in this way.'
  }];

  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '170';
  public name: string = 'Ambipom';
  public fullName: string = 'Ambipom CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Nice-Nice Catch attack - Draw 2 cards
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
      return state;
    }

    // Bye-Bye Throw attack - Discard up to 2 cards for 60 damage each
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Prompt player to choose up to 2 cards to discard from hand
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: false, min: 0, max: 2 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        // Calculate damage: 60 per card discarded
        const damage = cards.length * 60;
        effect.damage = damage;
        return state;
      });
    }

    return state;
  }
}