import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType, CardTag, SpecialCondition } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, CardTarget, EnergyCard, GameError, GameMessage, PlayerType, PokemonCardList, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { PikachuVUNIONTopRight } from './pikachu-v-union-tr';
import { PikachuVUNIONBottomLeft } from './pikachu-v-union-bl';
import { PikachuVUNIONBottomRight } from './pikachu-v-union-br';
import {WAS_ATTACK_USED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { OPPONENT_CANNOT_PLAY_ITEM_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class PikachuVUNIONTopLeft extends PokemonCard {
  public stage: Stage = Stage.VUNION;
  protected _tags = [CardTag.POKEMON_VUNION];
  public cardType: CardType[] = [L];
  public hp: number = 300;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Pikachu V-UNION Assembly',
    text: 'Once per game during your turn, combine 4 different Pikachu V-UNION from your discard pile and put them onto your bench.',
    useFromDiscard: true,
    exemptFromAbilityLock: true,
    powerType: PowerType.VUNION_ASSEMBLY,
  }];

  public attacks = [{
    name: 'Union Gain',
    cost: [C],
    damage: 0,
    text: 'Attach up to 2 [L] Energy cards from your discard pile to this Pokémon.'
  }, {
    name: 'Shocking Shock',
    cost: [L, C],
    damage: 120,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }, {
    name: 'Disconnect',
    cost: [L, L, C],
    damage: 150,
    text: 'During your opponent\'s next turn, they can\'t play any Item cards from their hand.'
  }, {
    name: 'Electro Ball Together',
    cost: [L, L, C],
    damage: 250,
    text: ''
  }];

  public set: string = 'SWSH';

  public regulationMark = 'E';

  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '139';
  public name: string = 'Pikachu V-UNION';
  public fullName: string = 'Pikachu V-UNION (Top Left) SWSH';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);
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
        if (card instanceof PikachuVUNIONTopLeft) {
          topLeftPiece = true;
        }
        if (card instanceof PikachuVUNIONTopRight) {
          topRightPiece = true;
        }
        if (card instanceof PikachuVUNIONBottomLeft) {
          bottomLeftPiece = true;
        }
        if (card instanceof PikachuVUNIONBottomRight) {
          bottomRightPiece = true;
        }
      });
      if (topLeftPiece && topRightPiece && bottomLeftPiece && bottomRightPiece) {
        if (slots.length > 0) {
          player.discard.cards.forEach(card => { if (card instanceof PikachuVUNIONTopRight) { MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); } });
          player.discard.cards.forEach(card => { if (card instanceof PikachuVUNIONBottomLeft) { MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); } });
          player.discard.cards.forEach(card => { if (card instanceof PikachuVUNIONBottomRight) { MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); } });
          player.discard.cards.forEach(card => { if (card instanceof PikachuVUNIONTopLeft) { MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); } });
          player.assembledVUNIONs.push(this.name);
          slots[0].pokemonPlayedTurn = state.turn;
        }
      } else {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
    }

    // Union Gain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let lightningsInDiscard = 0;
      player.discard.cards.forEach(card => {
        if (card instanceof EnergyCard && card.energyType === EnergyType.BASIC && card.name === 'Lightning Energy') {
          lightningsInDiscard++;
        }
      });
      if (lightningsInDiscard > 0) {
        const blocked: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
          if (card !== this) {
            blocked.push(target);
          }
        });
        state = store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: false, min: 0, max: Math.min(2, lightningsInDiscard), blockedTo: blocked }
        ), transfers => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        });
      }
    }

    // Shocking Shock
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          const specialCondition = new AddSpecialConditionsEffect(effect, [SpecialCondition.PARALYZED]);
          store.reduceEffect(state, specialCondition);
        }
      });
    }

    // Disconnect
    if (WAS_ATTACK_USED(effect, 2, this)) {
      return OPPONENT_CANNOT_PLAY_ITEM_CARDS(store, state, effect, this);
    }
    return state;
  }
}
