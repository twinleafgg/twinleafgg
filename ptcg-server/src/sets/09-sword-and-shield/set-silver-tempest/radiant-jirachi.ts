import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import {IS_ABILITY_BLOCKED,
  MULTIPLE_COIN_FLIPS_PROMPT,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class RadiantJirachi extends PokemonCard {
  protected _tags = [CardTag.RADIANT];
  public regulationMark = 'F';
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Entrusted Wishes',
      powerType: PowerType.ABILITY,
      text: "If this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent's Pokémon, search your deck for up to 3 cards and put them into your hand. Then, shuffle your deck.",
    },
  ];

  public attacks = [{
    name: 'Astral Misfortune',
    cost: [C, C],
    damage: 0,
    text: 'Flip 2 coins. If both of them are heads, your opponent\'s Active Pokémon is Knocked Out.'
  }];

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '120';
  public name: string = 'Radiant Jirachi';
  public fullName: string = 'Radiant Jirachi SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof KnockOutEffect &&
      effect.target.cards.includes(this) &&
      effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)
    ) {
      // This Pokemon was knocked out
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      let cards: any[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 3, allowCancel: false },
        ),
        (selected: any[]) => {
          cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
          }
          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order: any[]) => {
            player.deck.applyOrder(order);
            return state;
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, (results) => {
        if (results.every((r) => r)) {
          KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        }
      });
    }
    return state;
  }
}
