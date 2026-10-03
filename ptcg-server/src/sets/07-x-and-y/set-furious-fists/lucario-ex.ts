import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, ConfirmPrompt } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LucarioEx extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.FIGHTING];

  public hp: number = 180;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Missile Jab',
      cost: [CardType.FIGHTING],
      damage: 30,
      text: "This attack's damage isn't affected by Resistance.",
    },
    {
      name: 'Corkscrew Smash',
      cost: [CardType.FIGHTING, CardType.FIGHTING],
      damage: 60,
      text: 'You may draw cards until you have 6 cards in your hand.',
    },
    {
      name: 'Somersault Kick',
      cost: [CardType.FIGHTING, CardType.FIGHTING, CardType.FIGHTING],
      damage: 100,
      text: '',
    },
  ];

  public set: string = 'FFI';

  public name: string = 'Lucario-EX';

  public fullName: string = 'Lucario EX FFI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '54';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const cardsToDraw = 6 - player.hand.cards.length;
      if (cardsToDraw <= 0) {
        return state;
      }

      return store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_DRAW_CARDS),
        (result) => {
          if (result) {
            MOVE_CARDS(store, state, player.deck, player.hand, { count: cardsToDraw, sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}
