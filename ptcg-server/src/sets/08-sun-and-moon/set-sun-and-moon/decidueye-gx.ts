import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, BoardEffect } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {BLOCK_IF_DISCARD_EMPTY,
  BLOCK_IF_GX_ATTACK_USED,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class DecidueyeGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Dartrix';

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 240;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Feather Arrow',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn (before your attack), you may put 2 damage counters on 1 of your opponent's Pokémon.",
    },
  ];

  public attacks = [
    {
      name: 'Razor Leaf',
      cost: [CardType.GRASS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 90,
      text: '',
    },

    {
      name: 'Hollow Hunt-GX',
      cost: [CardType.GRASS],
      damage: 0,
      gxAttack: true,
      text: "Put 3 cards from your discard pile into your hand. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'SUM';

  public name: string = 'Decidueye-GX';

  public fullName: string = 'Decidueye-GX SUM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '12';

  public readonly FEATHER_ARROW_MARKER = 'FEATHER_ARROW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.FEATHER_ARROW_MARKER, this);
    }

    // Feather Arrow
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check marker
      if (player.marker.hasMarker(this.FEATHER_ARROW_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          player.marker.addMarker(this.FEATHER_ARROW_MARKER, this);

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          targets.forEach((target) => {
            target.damage += 20;
          });
        },
      );
    }

    // Hollow Hunt-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_DISCARD_EMPTY(player);
      BLOCK_IF_GX_ATTACK_USED(player);

      // set GX attack as used for game
      player.usedGX = true;

      const max = Math.min(3);
      const min = max;

      return store.prompt(
        state,
        [
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            {},
            { min, max, allowCancel: false },
          ),
        ],
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        },
      );
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.FEATHER_ARROW_MARKER, this);
    }
    return state;
  }
}
