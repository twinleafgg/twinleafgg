import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SpecialCondition } from '../../../game/store/card/card-types';
import {
  ChoosePokemonPrompt,
  ConfirmPrompt,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {
  BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  WAS_ATTACK_USED,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class DedenneGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_GX];
  public cardType: CardType[] = [CardType.LIGHTNING];
  public hp: number = 160;
  public weakness = [{ type: CardType.FIGHTING }];
  public resistance = [{ type: CardType.METAL, value: -20 }];
  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Dedechange',
      powerType: PowerType.ABILITY,
      text:
        ' When you play this Pokémon from your hand onto your Bench during your turn,' +
        " you may discard your hand and draw 6 cards.You can't use more than 1 Dedechange Ability each turn.",
    },
  ];

  public attacks = [
    {
      name: 'Static Shock',
      cost: [CardType.LIGHTNING, CardType.COLORLESS],
      damage: 50,
      text: '',
    },
    {
      name: 'Tingly Return-GX',
      cost: [CardType.LIGHTNING, CardType.COLORLESS],
      damage: 50,
      text:
        "Your opponent's Active Pokémon is now Paralyzed. Put this Pokémon and all cards attached to it into your hand." +
        " (You can't use more than 1 GX attack in a game.) ",
    },
  ];

  public set = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';
  public name = 'Dedenne-GX';
  public fullName = 'Dedenne GX UNB';
  public legacyFullName = 'Dedenne-GX UNB';

  public readonly DEDECHANGE_MARKER = 'DEDECHANGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.DEDECHANGE_MARKER)) {
      effect.player.marker.removeMarker(this.DEDECHANGE_MARKER, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (player.marker.hasMarker(this.DEDECHANGE_MARKER)) {
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
            player.marker.addMarker(this.DEDECHANGE_MARKER, this);

            const cards = player.hand.cards.filter((c) => c !== this);
            MOVE_CARDS(store, state, player.hand, player.discard, {
              cards: cards,
              sourceCard: this,
            });
            MOVE_CARDS(store, state, player.deck, player.hand, { count: 6, sourceCard: this });
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.PARALYZED,
      ]);
      store.reduceEffect(state, specialConditionEffect);

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { allowCancel: false },
        ),
        (result) => {
          const cardList = result.length > 0 ? result[0] : null;
          if (cardList !== null) {
            const pokemons = cardList.getPokemons();
            MOVE_CARDS(store, state, cardList, player.hand, { cards: pokemons, sourceCard: this });
            MOVE_CARDS(store, state, cardList, player.hand, { sourceCard: this });
            cardList.clearEffects();
          }
        },
      );
    }

    return state;
  }
}
