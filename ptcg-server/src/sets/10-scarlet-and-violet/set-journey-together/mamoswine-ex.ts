import {
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import {
  BoardEffect,
  CardTag,
  CardType,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Mamoswineex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom = 'Piloswine';
  public cardType: CardType[] = [F];
  public hp: number = 340;
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public powers = [
    {
      name: 'Mammoth Hauler',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may search your deck for a Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Rumbling March',
      cost: [F, F],
      damage: 180,
      damageCalculation: '+',
      text: 'This attack does 40 more damage for each Stage 2 Pokémon on your Bench.',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'JTG';
  public setNumber: string = '79';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mamoswine ex';
  public fullName: string = 'Mamoswine ex JTG';

  public readonly MAMMOTH_RIDE_MARKER = 'MAMMOTH_RIDE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.MAMMOTH_RIDE_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.MAMMOTH_RIDE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.marker.hasMarker(this.MAMMOTH_RIDE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: false },
        ),
        (cards) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          if (cards.length > 0) {
            state = store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {},
            );
          }

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
            player.marker.addMarker(this.MAMMOTH_RIDE_MARKER, this);
          });
        },
      );
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (player) => {
        if (player instanceof Mamoswineex) {
          player.marker.removeMarker(this.MAMMOTH_RIDE_MARKER);
        }
      });
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let stage2Count = 0;
      player.bench.forEach((bench) => {
        const pokemon = bench.getPokemonCard();
        if (pokemon && pokemon.stage === Stage.STAGE_2) {
          stage2Count++;
        }
      });

      effect.damage = 180 + stage2Count * 40;
    }

    return state;
  }
}
