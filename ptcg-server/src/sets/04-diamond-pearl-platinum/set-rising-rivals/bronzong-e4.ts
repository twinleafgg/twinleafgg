import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_UP_TO_X_CARDS, SHUFFLE_HAND_INTO_DECK_THEN_DRAW, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';

export class BronzongE4 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 90;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +20 }];
  public resistance = [{ type: R, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Hand Refresh',
    cost: [],
    damage: 0,
    text: 'Each player shuffles his or her hand into his or her deck and draws up to 4 cards. (You draw your cards first.)'
  }, {
    name: 'Payback',
    cost: [P, C],
    damage: 10,
    damageCalculation: '+',
    text: 'If your opponent has only 1 Prize card left, this attack does 10 damage plus 50 more damage and the Defending Pokémon is now Confused.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Bronzong E4';
  public fullName: string = 'Bronzong E4 RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hand Refresh
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, player, {
        sourceCard: this,
        resolveDraw: (store, state, player) => {
          DRAW_UP_TO_X_CARDS(store, state, player, 4);
          const opponent = StateUtils.getOpponent(state, player);
          SHUFFLE_HAND_INTO_DECK_THEN_DRAW(store, state, opponent, {
            sourceCard: this,
            resolveDraw: (store, state, opponent) => {
              DRAW_UP_TO_X_CARDS(store, state, opponent, 4);
            },
          });
        },
      });
    }

    // Payback
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.getPrizeLeft() === 1) {
        effect.damage += 50;
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    return state;
  }
}
