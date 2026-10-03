import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, BoardEffect } from '../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  PlayerType,
  ChooseCardsPrompt,
} from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { COPY_OPPONENT_ACTIVE_AND_BENCH_ATTACK } from '../../game/store/prefabs/copy-attack-prefabs';

export class ZoroarkGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Zorua';

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 210;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Trade',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may discard a card from your hand. If you do, draw 2 cards.',
    },
  ];

  public attacks = [
    {
      name: 'Riotous Beating',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: 'This attack does 20 damage for each of your Pokémon in play.',
    },

    {
      name: 'Trickster-GX',
      cost: [CardType.DARK, CardType.DARK],
      damage: 0,
      copycatAttack: true,
      gxAttack: true,
      text: "Choose 1 of your opponent's Pokémon's attacks and use it as this attack. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'SLG';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '53';

  public name: string = 'Zoroark-GX';

  public fullName: string = 'Zoroark GX SLG';

  public readonly TRADE_MARKER = 'TRADE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.TRADE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.TRADE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: true, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
            if (cardList.getPokemonCard() === this) {
              cardList.addBoardEffect(BoardEffect.ABILITY_USED);
            }
          });

          player.marker.addMarker(this.TRADE_MARKER, this);
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 2, sourceCard: this });
        },
      );
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let pokemonInPlay = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, () => {
        pokemonInPlay += 1;
      });
      effect.damage = 20 * pokemonInPlay;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;
      return COPY_OPPONENT_ACTIVE_AND_BENCH_ATTACK(store, state, effect as AttackEffect);
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.TRADE_MARKER, this);
    }
    return state;
  }
}
