import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseEnergyPrompt,
  GameError,
  GameMessage,
  StoreLike,
  State,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { TRAINER_TARGET_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Nita extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'TEU';
  public setNumber: string = '151';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Nita';
  public fullName: string = 'Nita TEU';
  public text: string =
    "You can play this card only if your opponent's Active Pokémon is a Basic Pokémon. Put an Energy from your opponent's Active Pokémon on top of their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Check if opponent's active is Basic
      const opponentActive = opponent.active.getPokemonCard();
      if (!opponentActive || opponentActive.stage !== Stage.BASIC) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check if opponent's active has energy
      const checkEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      state = store.reduceEffect(state, checkEnergy);

      if (checkEnergy.energyMap.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (TRAINER_TARGET_BLOCKED(store, state, player, this, opponent.active)) {
        return state;
      }

      // Choose an energy to put on top of opponent's deck
      store.prompt(
        state,
        new ChooseEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          checkEnergy.energyMap,
          [CardType.COLORLESS],
          { allowCancel: false },
        ),
        (energy) => {
          const cards: Card[] = (energy || []).map((e) => e.card);
          if (cards.length > 0) {
            // Put on top of opponent's deck (unshift = top)
            MOVE_CARDS(store, state, opponent.active, opponent.deck, {
              cards: cards,
              sourceCard: this,
            });
            // Move card to top (index 0)
            cards.forEach((c) => {
              const idx = opponent.deck.cards.indexOf(c);
              if (idx > 0) {
                opponent.deck.cards.splice(idx, 1);
                opponent.deck.cards.unshift(c);
              }
            });
          }
        },
      );
    }

    return state;
  }
}
