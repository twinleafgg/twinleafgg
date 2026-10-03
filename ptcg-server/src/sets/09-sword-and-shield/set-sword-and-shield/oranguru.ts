import { CardType, ChooseCardsPrompt, GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Oranguru extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 120;
  public retreat = [C, C];
  public weakness = [{ type: F }];

  public powers = [
    {
      name: 'Primate Wisdom',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may switch a card from your hand with the top card of your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Whap Down',
      cost: [C, C, C],
      damage: 70,
      text: '',
    },
  ];

  public set: string = 'SSH';
  public setNumber: string = '148';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Oranguru';
  public fullName: string = 'Oranguru SSH';

  public readonly PRIMATE_WISDOM_MARKER = 'PRIMATE_WISDOM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.PRIMATE_WISDOM_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0 || player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.PRIMATE_WISDOM_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          player.hand,
          {},
          { min: 1, max: 1, allowCancel: true },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
            const index = player.hand.cards.indexOf(cards[0]);
            if (index !== -1) {
              player.hand.cards.splice(index, 1);
              player.deck.cards.unshift(cards[0]);
            }
            player.marker.addMarker(this.PRIMATE_WISDOM_MARKER, this);
          }
        },
      );
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.PRIMATE_WISDOM_MARKER, this);
    }

    return state;
  }
}
