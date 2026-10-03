import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, GameMessage, PokemonCard, StateUtils } from '../../../game';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';

export class Crobat extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Golbat';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: P }];
  public retreat = [];

  public attacks = [{
    name: 'Flutter Trick',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, look at your opponent\'s hand and choose 1 card. Your opponent discards the card you chose.'
  }, {
    name: 'Triple Poison',
    cost: [G, C],
    damage: 10,
    text: 'The Defending Pokémon is now Poisoned. Put 3 damage counters instead of 1 on the Defending Pokémon between turns.'
  }];

  public set: string = 'HL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Crobat';
  public fullName: string = 'Crobat HL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          if (opponent.hand.cards.length == 0) {
            return state;
          }

          return store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.hand,
            {},
            { allowCancel: false, min: 1, max: 1 }
          ), selectedCard => {
            const selected = selectedCard || [];
            if (selectedCard === null || selected.length === 0) {
              return;
            }

            MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: selected, sourceEffect: this.attacks[0] });
          });
        }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const addSpecialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.POISONED]);
      addSpecialCondition.poisonDamage = 30;
      store.reduceEffect(state, addSpecialCondition);
    }

    return state;
  }

}