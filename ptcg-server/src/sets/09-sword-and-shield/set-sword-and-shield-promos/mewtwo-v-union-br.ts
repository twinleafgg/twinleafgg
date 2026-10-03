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
import { Effect } from '../../../game/store/effects/effect';

import { MewtwoVUNIONTopLeft } from './mewtwo-v-union-tl';
import { MewtwoVUNIONTopRight } from './mewtwo-v-union-tr';
import { MewtwoVUNIONBottomLeft } from './mewtwo-v-union-bl';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MewtwoVUNIONBottomRight extends PokemonCard {
  public stage: Stage = Stage.VUNION;
  protected _tags = [CardTag.POKEMON_VUNION];
  public cardType: CardType[] = [P];
  public hp: number = 310;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers: Power[] = [
    {
      name: 'Mewtwo V-UNION Assembly',
      text: 'Once per game during your turn, combine 4 different Mewtwo V-UNION from your discard pile and put them onto your bench.',
      useFromDiscard: true,
      exemptFromAbilityLock: true,
      powerType: PowerType.VUNION_ASSEMBLY,
    },
    {
      name: 'Photon Barrier',
      text: "Prevent all effects of attacks from your opponent's Pokémon done to this Pokémon. (Damage is not an effect.)",
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
    },
  ];

  public attacks = [
    {
      name: 'Final Burn',
      cost: [P, P, P, C],
      damage: 300,
      text: '',
    },
  ];

  public set: string = 'SWSH';
  public regulationMark = 'E';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '162';
  public name: string = 'Mewtwo V-UNION';
  public fullName: string = 'Mewtwo V-UNION (Bottom Right) SWSH';

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
        if (card instanceof MewtwoVUNIONTopLeft) {
          topLeftPiece = true;
        }
        if (card instanceof MewtwoVUNIONTopRight) {
          topRightPiece = true;
        }
        if (card instanceof MewtwoVUNIONBottomLeft) {
          bottomLeftPiece = true;
        }
        if (card instanceof MewtwoVUNIONBottomRight) {
          bottomRightPiece = true;
        }
      });

      if (topLeftPiece && topRightPiece && bottomLeftPiece && bottomRightPiece) {
        if (slots.length > 0) {
          player.discard.cards.forEach((card) => {
            if (card instanceof MewtwoVUNIONTopRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof MewtwoVUNIONBottomLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof MewtwoVUNIONBottomRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          // gotta make sure the actual mon ends up on top
          player.discard.cards.forEach((card) => {
            if (card instanceof MewtwoVUNIONTopLeft) {
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
