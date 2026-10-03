import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { HANDLE_ABILITY_LOCK } from '../../../game/store/prefabs/ability-lock';

export class AerodactylVstar extends PokemonCard {
  protected _tags = [CardTag.POKEMON_VSTAR];
  public stage: Stage = Stage.VSTAR;
  public evolvesFrom: string = 'Aerodactyl V';
  public cardType: CardType[] = [F];
  public hp: number = 260;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Lost Dive',
      cost: [F, C, C],
      damage: 240,
      text: 'Put the top 3 cards of your deck in the Lost Zone.',
    },
    {
      name: 'Ancient Star',
      cost: [C],
      damage: 0,
      text: 'Until this Pokémon leaves play, it gains an Ability that has the effect "Your opponent\'s Pokémon V in play, except any Aerodactyl VSTAR, have no Abilities." (You can\'t use more than 1 VSTAR Power in a game.)',
    },
  ];

  public regulationMark: string = 'F';
  public set: string = 'LOR';
  public setNumber: string = '93';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Aerodactyl VSTAR';
  public fullName: string = 'Aerodactyl VSTAR LOR 93';

  public ancientStarActive: boolean = false;

  private static readonly V_TAGS = [CardTag.POKEMON_V, CardTag.POKEMON_VMAX, CardTag.POKEMON_VSTAR];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const lostCount = Math.min(3, player.deck.cards.length);
      if (lostCount > 0) {
        MOVE_CARDS(store, state, player.deck, player.lostzone, { count: lostCount, sourceCard: this });
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      player.usedVSTAR = true;
      this.ancientStarActive = true;
    }

    if (this.ancientStarActive) {
      let isInPlay = false;
      let aerodactylPlayer = state.players[0];
      state.players.forEach((p) => {
        p.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
          if (card === this) {
            isInPlay = true;
            aerodactylPlayer = p;
          }
        });
      });

      if (!isInPlay) {
        this.ancientStarActive = false;
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, aerodactylPlayer, this)) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, aerodactylPlayer);

      HANDLE_ABILITY_LOCK(
        effect,
        ({ card }) => {
          if (card.name === 'Aerodactyl VSTAR') {
            return false;
          }

          if (!AerodactylVstar.V_TAGS.some((tag) => card.hasTag(tag))) {
            return false;
          }

          let targetBelongsToOpponent = false;
          opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, pokemon) => {
            if (pokemon === card) {
              targetBelongsToOpponent = true;
            }
          });
          if (!targetBelongsToOpponent) {
            return false;
          }

          try {
            return StateUtils.findCardList(state, card) instanceof PokemonCardList;
          } catch {
            return false;
          }
        },
        {
          allowUseFromHand: true,
          allowUseFromDiscard: true,
          error: GameMessage.BLOCKED_BY_ABILITY,
        },
      );
    }

    return state;
  }
}
