import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  ShuffleDeckPrompt,
  TrainerCard,
  GameMessage,
} from '../../../game';
import {
  ABILITY_USED,
  AFTER_ATTACK,
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  MOVE_POKEMON_OFF_BOARD,
  SEARCH_DECK_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';

export class LumineonV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 170;
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [
    {
      name: 'Luminous Sign',
      powerType: PowerType.ABILITY,
      text:
        'When you play this Pokemon from your hand onto your ' +
        'Bench during your turn, you may search your deck for a ' +
        'Supporter card, reveal it, and put it into your hand. Then, ' +
        'shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Aqua Return',
      cost: [W, C, C],
      damage: 120,
      text: 'Shuffle this Pokémon and all attached cards into your deck.',
    },
  ];

  public regulationMark = 'F';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';
  public name: string = 'Lumineon V';
  public fullName: string = 'Lumineon V BRS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof TrainerCard && card.trainerType !== TrainerType.SUPPORTER) {
          blocked.push(index);
        }
      });

      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (result) => {
          if (result) {
            ABILITY_USED(player, this);
            SEARCH_DECK_FOR_CARDS_TO_HAND(
              store,
              state,
              player,
              this,
              { superType: SuperType.TRAINER },
              { min: 0, max: 1, allowCancel: false, blocked },
              this.powers[0],
            );
          }
        },
        GameMessage.WANT_TO_USE_ABILITY,
      );
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
        pokemonDestination: player.deck,
        sourceCard: this,
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });
    }
    return state;
  }
}
