import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { PlayerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { PokemonCard } from '../../../game/store/card/pokemon-card';

export class TeamPlasmaBadge extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  protected _tags = [CardTag.TEAM_PLASMA];
  public set: string = 'PLF';
  public setNumber: string = '104';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Team Plasma Badge';
  public fullName: string = 'Team Plasma Badge PLF';
  public text: string = 'The Pokémon this card is attached to is a Team Plasma Pokémon.';

  private injectedTeamPlasmaTags: { [id: number]: PokemonCard } = {};

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    const shouldSync =
      effect instanceof CheckTableStateEffect ||
      (effect instanceof TrainerEffect && effect.trainerCard === this);

    if (!shouldSync) {
      return state;
    }

    const activeBadgeTargets = new Set<number>();

    state.players.forEach((player) => {
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard) => {
        if (!cardList.tools.includes(this) || IS_TOOL_BLOCKED(store, state, player, this)) {
          return;
        }

        const idx = pokemonCard.tags.indexOf(CardTag.TEAM_PLASMA);
        if (idx !== -1) {
          pokemonCard.tags.splice(idx, 1);
        }
        activeBadgeTargets.add(pokemonCard.id);

        if (!pokemonCard.hasTag(CardTag.TEAM_PLASMA)) {
          pokemonCard.addRuntimeTag(CardTag.TEAM_PLASMA);
          this.injectedTeamPlasmaTags[pokemonCard.id] = pokemonCard;
        }
        delete this.injectedTeamPlasmaTags[pokemonCard.id];
      });
    });

    for (const id of Object.keys(this.injectedTeamPlasmaTags).map(Number)) {
      if (activeBadgeTargets.has(id)) {
        continue;
      }

      const pokemonCard = this.injectedTeamPlasmaTags[id];
      const idx = pokemonCard.tags.indexOf(CardTag.TEAM_PLASMA);
      if (idx !== -1) {
        pokemonCard.removeRuntimeTag(CardTag.TEAM_PLASMA);
      }
      delete this.injectedTeamPlasmaTags[id];
    }

    return state;
  }
}
