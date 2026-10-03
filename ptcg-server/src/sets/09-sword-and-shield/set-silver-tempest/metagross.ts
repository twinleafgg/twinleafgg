import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ConfirmPrompt, GameMessage, PokemonCardList, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DrewTopdeckEffect } from '../../../game/store/effects/game-phase-effects';
import {IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { NEXT_TURN_ATTACK_BONUS } from '../../../game/store/prefabs/attack-effects';

export class Metagross extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Metang';
  public cardType: CardType[] = [M];
  public hp: number = 170;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Emergency Entry',
    powerType: PowerType.ABILITY,
    useFromHand: true,
    text: 'Once during your turn, if you drew this Pokémon from your deck at the beginning of your turn and your Bench isn\'t full, before you put it into your hand, you may put it onto your Bench. If you do, draw 3 cards.'
  }];

  public attacks = [{
    name: 'Meteor Mash',
    cost: [M, C],
    damage: 100,
    text: 'During your next turn, this Pokémon\'s Meteor Mash attack does 100 more damage (before applying Weakness and Resistance).'
  }];

  public regulationMark = 'F';
  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '119';
  public name: string = 'Metagross';
  public fullName: string = 'Metagross SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Emergency Entry
    if (effect instanceof DrewTopdeckEffect && effect.handCard === this) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);

      if (slots.length === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {

          const cards = player.hand.cards.filter(c => c.cards === this.cards);

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.hand, slots[index], { cards: [card], sourceCard: this });
            slots[index].pokemonPlayedTurn = state.turn;
          });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
        }
      });
    }

    // Meteor Mash
    NEXT_TURN_ATTACK_BONUS(effect, {
      attack: this.attacks[0],
      source: this,
      bonusDamage: 100,
    });

    return state;
  }
}
