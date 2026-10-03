import { GameError, GameMessage, PlayerType } from '../../../game';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class TeamGalacticsInventionG101EnergyGain extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PL';
  public name: string = "Team Galactic's Invention G-101 Energy Gain";
  public fullName: string = "Team Galactic's Invention G-101 Energy Gain PL";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '116';

  public text: string =
    "Attach Team Galactic's Invention G-101 Energy Gain to 1 of your Pokémon SP that doesn't already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. When the Pokémon this card is attached to is no longer a Pokémon SP, discard this card. \n\n As long as Team Galactic's Invention G-101 Energy Gain is attached to a Pokémon, the attack cost of that Pokémon's attacks is [C] less.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard == this) {
      if (!effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_SP)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (!cardList.cards.includes(this)) {
            return;
          }
          const attachedTo = cardList.getPokemonCard();

          if (!!attachedTo && !attachedTo.hasTag(CardTag.POKEMON_SP)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
            attachedTo.tools === undefined;
          }
        });
      });
    }

    if (effect instanceof CheckAttackCostEffect && effect.player.active.tools.includes(this)) {
      const index = effect.cost.indexOf(CardType.COLORLESS);

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }

      // No cost to reduce
      if (index === -1) {
        return state;
      }

      if (effect.player.active.getPokemonCard()?.hasTag(CardTag.POKEMON_SP)) {
        effect.cost.splice(index, 1);
      }

      return state;
    }

    return state;
  }
}
