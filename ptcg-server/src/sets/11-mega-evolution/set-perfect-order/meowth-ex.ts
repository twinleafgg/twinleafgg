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
import { PowerType, StoreLike, State, TrainerCard, GameMessage, GameError } from '../../../game';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {
  ABILITY_USED,
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  MOVE_POKEMON_OFF_BOARD,
  SEARCH_DECK_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';

export class Meowthex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 170;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Last-Ditch Catch',
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, when you play this Pokémon from your hand onto your Bench, you may use this Ability. Search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck. You can\'t use more than 1 Ability that has "Last-Ditch" in its name each turn.',
    },
  ];

  public attacks = [
    {
      name: 'Tuck Tail',
      cost: [C, C, C],
      damage: 60,
      text: 'Put this Pokémon and all attached cards into your hand.',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Meowth ex';
  public fullName: string = 'Meowth ex M3';
  public readonly TRUMP_CARD_MARKER = 'TRUMP_CARD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (player.marker.hasMarker(this.TRUMP_CARD_MARKER)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
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
            player.marker.addMarkerToState(this.TRUMP_CARD_MARKER);
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

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.TRUMP_CARD_MARKER)) {
      effect.player.marker.removeMarker(this.TRUMP_CARD_MARKER);
    }

    if (effect instanceof AfterAttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      MOVE_POKEMON_OFF_BOARD(store, state, player.active, {
        pokemonDestination: player.hand,
        sourceCard: this,
      });
      return state;
    }
    return state;
  }
}
