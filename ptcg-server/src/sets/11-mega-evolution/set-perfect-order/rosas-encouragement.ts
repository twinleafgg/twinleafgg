import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  StateUtils,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  Player,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { GameError } from '../../../game/game-error';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RosasEncouragement extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = "Rosa's Encouragement";
  public fullName: string = "Rosa's Encouragement M3";
  public text: string = `You can use this card only if you have more Prize cards remaining than your opponent.

Attach up to 2 Basic Energy cards from your discard pile to 1 of your Stage 2 Pokémon.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean | undefined {
    const opponent = StateUtils.getOpponent(state, player);
    if (player.supporterTurn > 0) {
      return false;
    }
    if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
      return false;
    }
    const basicEnergyInDiscard = player.discard.cards.filter(
      (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
    );
    if (basicEnergyInDiscard.length === 0) {
      return false;
    }
    const stage2Pokemon: any[] = [];
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const pokemonCard = cardList.getPokemonCard();
      if (pokemonCard && pokemonCard.stage === Stage.STAGE_2) {
        stage2Pokemon.push(cardList);
      }
    });
    if (stage2Pokemon.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Check if player has more Prize cards remaining than opponent
      if (player.getPrizeLeft() <= opponent.getPrizeLeft()) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check for Basic Energy in discard
      const basicEnergyInDiscard = player.discard.cards.filter(
        (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
      );

      if (basicEnergyInDiscard.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check for Stage 2 Pokemon
      const stage2Pokemon: any[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard && pokemonCard.stage === Stage.STAGE_2) {
          stage2Pokemon.push(cardList);
        }
      });

      if (stage2Pokemon.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      const maxToAttach = Math.min(2, basicEnergyInDiscard.length);

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, stage: Stage.STAGE_2 },
          { allowCancel: false, min: 0, max: maxToAttach, sameTarget: true },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }
        },
      );
    }

    return state;
  }
}
