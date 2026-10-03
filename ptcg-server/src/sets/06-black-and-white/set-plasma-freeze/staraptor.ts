import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Staraptor extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Staravia';
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Wing Attack',
      cost: [C, C, C],
      damage: 60,
      text: ''
    },
    {
      name: 'Strong Breeze',
      cost: [C, C, C, C],
      damage: 0,
      text: 'Your opponent shuffles the Defending Pokémon and all cards attached to it into his or her deck.'
    }
  ];

  public set: string = 'PLF';
  public setNumber: string = '97';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Staraptor';
  public fullName: string = 'Staraptor PLF';

  public usedStrongBreeze = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 2: Strong Breeze - shuffle opponent's active and all attached into their deck
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.usedStrongBreeze = true;
    }

    // Execute after attack (so it doesn't interfere with attack resolution)
    if (effect instanceof AfterAttackEffect && this.usedStrongBreeze) {
      this.usedStrongBreeze = false;

      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Move all cards from opponent's active to their deck
      const cardsToShuffle = opponent.active.cards.slice();
      cardsToShuffle.forEach(card => {
        MOVE_CARDS(store, state, opponent.active, opponent.deck, { cards: [card], sourceCard: this });
      });
      opponent.active.clearEffects();

      SHUFFLE_DECK(store, state, opponent);
    }

    if (effect instanceof EndTurnEffect) {
      this.usedStrongBreeze = false;
    }

    return state;
  }
}
