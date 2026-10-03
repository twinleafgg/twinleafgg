import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SWITCH_ACTIVE_WITH_BENCHED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class Litwick2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: D }];
  public retreat = [C];

  public attacks = [{
    name: 'Astonish',
    cost: [P],
    damage: 10,
    text: 'Choose 1 card from your opponent\'s hand without looking and shuffle it into your opponent\'s deck.'
  }, {
    name: 'Ambush',
    cost: [P, C],
    damage: 10,
    text: 'Flip a coin. If heads, this attack does 20 more damage. If tails, switch this Pokémon with 1 of your Benched Pokémon.'
  }];

  public set: string = 'NVI';
  public setNumber: string = '58';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Litwick';
  public fullName: string = 'Litwick NVI 58';

  private shouldSwitch: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Astonish - shuffle random card from opponent's hand into deck
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length > 0) {
        // Pick random card
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const card = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: [card], sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
          opponent.deck.applyOrder(order);
        });
      }
    }

    // Ambush - flip, heads = +20, tails = switch self
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, (result: boolean) => {
        if (result) {
          effect.damage += 20;
        } else {
          this.shouldSwitch = true;
        }
      });
    }

    // After attack, switch self if tails
    if (effect instanceof AfterAttackEffect && this.shouldSwitch) {
      this.shouldSwitch = false;
      const player = effect.player;
      const hasBenched = player.bench.some(b => b.cards.length > 0);

      if (hasBenched) {
        SWITCH_ACTIVE_WITH_BENCHED(store, state, player);
      }
    }

    // Cleanup
    if (effect instanceof EndTurnEffect && this.shouldSwitch) {
      this.shouldSwitch = false;
    }

    return state;
  }
}
