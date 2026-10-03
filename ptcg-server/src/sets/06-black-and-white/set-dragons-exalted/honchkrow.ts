import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StateUtils, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, CONFIRMATION_PROMPT, SWITCH_ACTIVE_WITH_BENCHED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Honchkrow extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Murkrow';
  public cardType: CardType[] = [D];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Whirlwind',
      cost: [C, C],
      damage: 30,
      text: 'You may have your opponent switch the Defending Pokémon with 1 of his or her Benched Pokémon.'
    },
    {
      name: 'Diving Swipe',
      cost: [D, C, C],
      damage: 70,
      text: 'Discard a random card from your opponent\'s hand.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '73';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Honchkrow';
  public fullName: string = 'Honchkrow DRX';

  public usedWhirlwind = false;
  public wantsToSwitch = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Whirlwind - optional opponent switch after damage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const opponentHasBench = opponent.bench.some(b => b.cards.length > 0);

      if (opponentHasBench) {
        this.usedWhirlwind = true;
        CONFIRMATION_PROMPT(store, state, effect.player, result => {
          this.wantsToSwitch = result;
        });
      }
    }

    if (effect instanceof AfterAttackEffect && this.usedWhirlwind) {
      this.usedWhirlwind = false;
      if (this.wantsToSwitch) {
        this.wantsToSwitch = false;
        const opponent = StateUtils.getOpponent(state, effect.player);
        SWITCH_ACTIVE_WITH_BENCHED(store, state, opponent);
      }
    }

    if (effect instanceof EndTurnEffect) {
      this.usedWhirlwind = false;
      this.wantsToSwitch = false;
    }

    // Diving Swipe - discard random card from opponent's hand
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      if (opponent.hand.cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
        const cardToDiscard = opponent.hand.cards[randomIndex];
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [cardToDiscard], sourceCard: this });
      }
    }

    return state;
  }
}
