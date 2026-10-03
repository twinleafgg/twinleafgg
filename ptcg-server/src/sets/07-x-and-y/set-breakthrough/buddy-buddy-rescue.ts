import { ChooseCardsPrompt, GameError, GameMessage, PokemonCard, StateUtils } from '../../../game';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardToHandEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class BuddyBuddyRescue extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BKT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '135';

  public name: string = 'Buddy-Buddy Rescue';

  public fullName: string = 'Buddy-Buddy Rescue SSH';

  public text: string =
    'Each player puts a Pokémon from his or her discard pile into his or her hand. (Your opponent chooses first.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count Pokemon in discard piles and build blocked lists
      let pokemonInPlayersDiscard: number = 0;
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (c instanceof PokemonCard) {
          pokemonInPlayersDiscard += 1;
        } else {
          blocked.push(index);
        }
      });

      let pokemonInOpponentsDiscard: number = 0;
      const blockedOpponent: number[] = [];
      opponent.discard.cards.forEach((c, index) => {
        if (c instanceof PokemonCard) {
          pokemonInOpponentsDiscard += 1;
        } else {
          blockedOpponent.push(index);
        }
      });

      // Check if card can be played
      if (pokemonInOpponentsDiscard === 0 && pokemonInPlayersDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      // Check if effect is prevented
      const discardEffect = new DiscardToHandEffect(player, this);
      store.reduceEffect(state, discardEffect);

      if (discardEffect.preventDefault) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            player.supporter,
            { superType: SuperType.TRAINER },
            { min: 1, max: 1, allowCancel: false },
          ),
          (selected) => {
            if (selected && selected.length > 0) {
              MOVE_CARDS(store, state, player.supporter, player.discard, {
                cards: selected,
                sourceCard: this,
              });
            }
          },
        );
        return state;
      }

      // Handle opponent's selection first
      if (pokemonInOpponentsDiscard > 0) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            opponent,
            GameMessage.CHOOSE_CARD_TO_HAND,
            opponent.discard,
            { superType: SuperType.POKEMON },
            { min: 1, max: 1, allowCancel: false, blocked: blockedOpponent },
          ),
          (selected) => {
            if (selected && selected.length > 0) {
              store.prompt(
                state,
                new ChooseCardsPrompt(
                  opponent,
                  GameMessage.CHOOSE_CARD_TO_HAND,
                  opponent.discard,
                  { superType: SuperType.POKEMON },
                  { min: 1, max: 1, allowCancel: false },
                ),
                (selected) => {
                  if (selected && selected.length > 0) {
                    MOVE_CARDS(store, state, opponent.discard, opponent.hand, {
                      cards: selected,
                      sourceCard: this,
                    });
                  }
                },
              );
            }
          },
        );
      }

      // Handle player's selection
      if (pokemonInPlayersDiscard > 0) {
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            { superType: SuperType.POKEMON },
            { min: 1, max: 1, allowCancel: false, blocked },
          ),
          (selected) => {
            if (selected && selected.length > 0) {
              store.prompt(
                state,
                new ChooseCardsPrompt(
                  player,
                  GameMessage.CHOOSE_CARD_TO_HAND,
                  player.discard,
                  { superType: SuperType.POKEMON },
                  { min: 1, max: 1, allowCancel: false },
                ),
                (selected) => {
                  if (selected && selected.length > 0) {
                    MOVE_CARDS(store, state, player.discard, player.hand, {
                      cards: selected,
                      sourceCard: this,
                    });
                  }
                },
              );
            }
          },
        );
      }

      // Move the trainer card to discard after both selections
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.supporter,
          { superType: SuperType.TRAINER },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, player.supporter, player.discard, {
              cards: selected,
              sourceCard: this,
            });
          }
        },
      );
      return state;
    }
    return state;
  }
}
