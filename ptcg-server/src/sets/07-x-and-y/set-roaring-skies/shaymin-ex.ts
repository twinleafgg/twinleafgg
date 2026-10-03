import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { PowerType, StoreLike, State, ConfirmPrompt, GameMessage } from '../../../game';
import { PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND } from '../../../game/store/prefabs/attack-effects';
import {ABILITY_USED,
  IS_ABILITY_BLOCKED,
  AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class ShayminEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Set Up',
      powerType: PowerType.ABILITY,
      text:
        'When you put this Pokemon from your hand onto your Bench, ' +
        'you may draw cards until you have 6 cards in your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Sky Return',
      cost: [C, C],
      damage: 30,
      text: 'Return this Pokemon and all cards attached to it to your hand.',
    },
  ];

  public set: string = 'ROS';
  public name: string = 'Shaymin-EX';
  public fullName: string = 'Shaymin EX ROS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const cards = player.hand.cards.filter((c) => c !== this);
      const cardsToDraw = Math.max(0, 6 - cards.length);
      if (cardsToDraw === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            ABILITY_USED(player, this);
            MOVE_CARDS(store, state, player.deck, player.hand, { count: cardsToDraw, sourceCard: this });
          }
        },
      );
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      PUT_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_HAND(store, state, effect);
      return state;
    }

    return state;
  }
}
