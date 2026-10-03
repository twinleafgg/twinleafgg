import { PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { AttachEnergyPrompt, GameError, StateUtils } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { IS_ABILITY_BLOCKED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class CafeMaster extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public regulationMark = 'E';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '133';
  public name: string = 'Café Master';
  public fullName: string = 'Café Master BRS';

  public text: string =
    'Choose up to 3 of your Benched Pokémon. For each of those Pokémon, search your deck for a different type of basic Energy card and attach it to that Pokémon. Then, shuffle your deck. Your turn ends.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      // Check if supporter was already played this turn
      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      // Move card to supporter area and prevent default discard
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      // Prompt player to attach energy cards
      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: 3, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];

          // Validate energy type selection if multiple cards chosen
          if (transfers.length > 1) {
            const cardNames = new Set<string>();
            for (const transfer of transfers) {
              if (cardNames.has(transfer.card.name)) {
                throw new GameError(GameMessage.CAN_ONLY_SELECT_TWO_DIFFERENT_ENERGY_TYPES);
              }
              cardNames.add(transfer.card.name);
            }
          }

          // Attach energy cards to targets
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }

          // Always shuffle deck after energy attachment (or no attachment)
          SHUFFLE_DECK(store, state, player);
        },
      );

      // Move supporter card to discard pile

      // Check if we should end turn based on active Pokemon
      const playerActive = player.active.getPokemonCard();
      if (
        playerActive &&
        playerActive.fullName !== 'Alcremie BRS' &&
        !IS_ABILITY_BLOCKED(store, state, player, playerActive)
      ) {
        const endTurnEffect = new EndTurnEffect(player);
        return store.reduceEffect(state, endTurnEffect);
      }
    }

    return state;
  }
}
