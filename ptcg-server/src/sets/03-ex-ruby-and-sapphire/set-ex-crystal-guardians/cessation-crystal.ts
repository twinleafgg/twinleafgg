import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StateUtils } from '../../../game/store/state-utils';
import { Player } from '../../../game/store/state/player';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { GameError, GameMessage } from '../../../game';
import {
  HANDLE_ABILITY_BLOCK,
  POKEPOWER_AND_BODY_TYPES,
} from '../../../game/store/prefabs/ability-lock';

export class CessationCrystal extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'CG';
  public name: string = 'Cessation Crystal';
  public fullName: string = 'Cessation Crystal CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public text: string =
    "Attach Cessation Crystal to 1 of your Pokémon (excluding Pokémon-ex) that doesn't already have a Pokémon Tool attached to it. If the Pokémon Cessation Crystal is attached to is a Pokémon-ex, discard this card.\n\nAs long as Cessation Crystal is attached to an Active Pokémon, each player's Pokémon(both yours and your opponent's) can't use any Poké-Powers or Poké-Bodies.";

  private isCrystalActiveOnPlayer(store: StoreLike, state: State, player: Player): boolean {
    if (!player.active.tools.includes(this) || IS_TOOL_BLOCKED(store, state, player, this)) {
      return false;
    }
    if (player.active.getPokemonCard()?.hasTag(CardTag.POKEMON_ex)) {
      MOVE_CARDS(store, state, player.active, player.discard, { cards: [this], sourceCard: this });
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_BLOCK(
      effect,
      ({ player }) => {
        const opponent = StateUtils.getOpponent(state, player);
        return (
          this.isCrystalActiveOnPlayer(store, state, player) ||
          this.isCrystalActiveOnPlayer(store, state, opponent)
        );
      },
      {
        powerTypes: POKEPOWER_AND_BODY_TYPES,
        error: GameMessage.BLOCKED_BY_EFFECT,
      },
    );

    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard == this) {
      if (effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_ex)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    return state;
  }
}
