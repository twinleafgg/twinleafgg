import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PokemonCardList, Power, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/game-effects';
import { ZacianVUNIONTopLeft } from './zacian-v-union-tl';
import { ZacianVUNIONBottomLeft } from './zacian-v-union-bl';
import { ZacianVUNIONBottomRight } from './zacian-v-union-br';
import {WAS_POWER_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_DOES_LESS_DAMAGE } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class ZacianVUNIONTopRight extends PokemonCard {
  public stage: Stage = Stage.VUNION;
  protected _tags = [CardTag.POKEMON_VUNION];
  public cardType: CardType[] = [M];
  public hp: number = 320;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public powers: Power[] = [{
    name: 'Zacian V-UNION Assembly',
    text: 'Once per game during your turn, combine 4 different Zacian V-UNION from your discard pile and put them onto your bench.',
    useFromDiscard: true,
    exemptFromAbilityLock: true,
    powerType: PowerType.VUNION_ASSEMBLY,
  }];

  public attacks = [{
    name: 'Dance of the Crowned Sword',
    cost: [M, M, C],
    damage: 150,
    text: 'During your opponent\'s next turn, the Defending Pokémon\'s attacks do 150 less damage (before applying Weakness and Resistance).'
  }];

  public regulationMark = 'E';
  public set: string = 'SWSH';
  public setNumber: string = '164';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zacian V-UNION';
  public fullName: string = 'Zacian V-UNION (Top Right) SWSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Zacian V-UNION Assembly
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
        if (card instanceof ZacianVUNIONTopLeft) {
          topLeftPiece = true;
        }
        if (card instanceof ZacianVUNIONTopRight) {
          topRightPiece = true;
        }
        if (card instanceof ZacianVUNIONBottomLeft) {
          bottomLeftPiece = true;
        }
        if (card instanceof ZacianVUNIONBottomRight) {
          bottomRightPiece = true;
        }
      });

      if (topLeftPiece && topRightPiece && bottomLeftPiece && bottomRightPiece) {
        if (slots.length > 0) {
          player.discard.cards.forEach((card) => {
            if (card instanceof ZacianVUNIONTopRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof ZacianVUNIONBottomLeft) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof ZacianVUNIONBottomRight) {
              MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this });
            }
          });
          player.discard.cards.forEach((card) => {
            if (card instanceof ZacianVUNIONTopLeft) {
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

    // Dance of the Crowned Sword
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_DOES_LESS_DAMAGE(store, state, effect, this, 150);
    }

    return state;
  }
}
