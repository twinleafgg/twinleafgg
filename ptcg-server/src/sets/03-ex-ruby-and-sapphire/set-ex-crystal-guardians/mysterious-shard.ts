import { GameError, GameMessage, PlayerType } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import {IS_TOOL_BLOCKED, MOVE_CARD_TO, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { GamePhase, State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class MysteriousShard extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'CG';
  public name: string = 'Mysterious Shard';
  public fullName: string = 'Mysterious Shard CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';

  public text: string =
    "Attach Mysterious Shard to 1 of your Pokémon (excluding Pokémon-ex) that doesn't already have a Pokémon Tool attached to it. If the Pokémon Mysterious Shard is attached to is a Pokémon-ex, discard this card. \n\nPrevent all effects of attacks, including damage, done to the Pokémon that Mysterious Shard is attached to by your opponent's Pokémon-ex .Discard this card at the end of your opponent's next turn.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      const sourceCard = effect.source.getPokemonCard();

      // Card is not active, or damage source is unknown
      if (!effect.target.cards.includes(this) || sourceCard === undefined) {
        return state;
      }

      // Do not ignore self-damage from Pokemon-Ex
      const player = StateUtils.findOwner(state, effect.target);
      const opponent = StateUtils.findOwner(state, effect.source);
      if (player === opponent) {
        return state;
      }

      // It's not an attack
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      if (sourceCard.hasTag(CardTag.POKEMON_ex)) {
        // Try to reduce PowerEffect, to check if something is blocking our ability
        if (IS_TOOL_BLOCKED(store, state, player, this)) {
          return state;
        }
        effect.preventDefault = true;
      }
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (!cardList.cards.includes(this)) {
            return state;
          }

          const attachedTo = cardList.getPokemonCard();

          if (IS_TOOL_BLOCKED(store, state, player, this)) {
            return state;
          }

          if (!!attachedTo && attachedTo.hasTag(CardTag.POKEMON_ex)) {
            MOVE_CARD_TO(state, this, player.discard);
          }
        });
      });
      return state;
    }

    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard == this) {
      if (effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_ex)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Discard card at the end of opponent's turn
    if (effect instanceof EndTurnEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (
            cardList.tools.includes(this) &&
            StateUtils.findOwner(state, cardList) !== effect.player
          ) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }
    return state;
  }
}
