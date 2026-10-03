import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PokemonCardList,
  Power,
  PowerType,
  State,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/game-effects';
import { MorpekoVUNIONTopLeft } from './morpeko-v-union-tl';
import { MorpekoVUNIONBottomLeft } from './morpeko-v-union-bl';
import { MorpekoVUNIONBottomRight } from './morpeko-v-union-br';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MorpekoVUNIONTopRight extends PokemonCard {
  public stage: Stage = Stage.VUNION;
  protected _tags = [CardTag.POKEMON_VUNION];
  public cardType: CardType[] = [L];
  public hp: number = 310;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers: Power[] = [
    {
      name: 'Morpeko V-UNION Assembly',
      text: 'Once per game during your turn, combine 4 different Morpeko V-UNION from your discard pile and put them onto your bench.',
      useFromDiscard: true,
      exemptFromAbilityLock: true,
      powerType: PowerType.VUNION_ASSEMBLY,
    },
  ];

  public attacks = [
    {
      name: 'All You Can Eat',
      cost: [C, C],
      damage: 0,
      text: 'Draw cards until you have 10 cards in your hand.',
    },
  ];

  public set: string = 'SWSH';
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '216';
  public name: string = 'Morpeko V-UNION';
  public fullName: string = 'Morpeko V-UNION (Top Right) SWSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // assemblin the v-union
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.assembledVUNIONs.includes(this.name)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let topLeftPiece = false;
      let topRightPiece = false;
      let bottomLeftPiece = false;
      let bottomRightPiece = false;
      player.discard.cards.forEach((card) => {
        if (card instanceof MorpekoVUNIONTopLeft) {
          topLeftPiece = true;
        }
        if (card instanceof MorpekoVUNIONTopRight) {
          topRightPiece = true;
        }
        if (card instanceof MorpekoVUNIONBottomLeft) {
          bottomLeftPiece = true;
        }
        if (card instanceof MorpekoVUNIONBottomRight) {
          bottomRightPiece = true;
        }
      });

      if (topLeftPiece && topRightPiece && bottomLeftPiece && bottomRightPiece) {
        if (slots.length > 0) {
          player.discard.cards.forEach((card) => {
            if (card instanceof MorpekoVUNIONTopRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof MorpekoVUNIONBottomLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof MorpekoVUNIONBottomRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          // gotta make sure the actual mon ends up on top
          player.discard.cards.forEach((card) => {
            if (card instanceof MorpekoVUNIONTopLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.assembledVUNIONs.push(this.name);
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    return state;
  }
}
