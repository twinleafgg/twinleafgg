import { GameError, GameMessage, PlayerType } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class SolidRage extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'UF';
  public name: string = 'Solid Rage';
  public fullName: string = 'Solid Rage UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';

  public text: string =
    "Attach Solid Rage to 1 of your Evolved Pokémon (excluding Pokémon-ex) that doesn't already have a Pokémon Tool attached to it. If the Pokémon Solid Rage is attached to is a Basic Pokémon or Pokémon-ex, discard Solid Rage.\n\nIf you have more Prize cards left than your opponent, the Pokémon that Solid Rage is attached to does 20 more damage to the Active Pokémon (before applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard == this) {
      if (
        effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_ex) ||
        effect.target.getPokemons().length < 2
      ) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    if (effect instanceof DealDamageEffect && effect.player.active.tools.includes(this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, effect.player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      if (effect.target !== player.active && effect.target !== opponent.active) {
        return state;
      }

      const attack = effect.attack;
      if (player.getPrizeLeft() > opponent.getPrizeLeft()) {
        if (attack && attack.damage > 0 && effect.target === opponent.active) {
          effect.damage += 20;
        }
      }
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (!cardList.cards.includes(this)) {
            return;
          }
          const attachedTo = cardList.getPokemonCard();

          if (!!attachedTo && attachedTo.hasTag(CardTag.POKEMON_ex)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
            attachedTo.tools === undefined;
          }
        });
      });
    }

    return state;
  }
}
