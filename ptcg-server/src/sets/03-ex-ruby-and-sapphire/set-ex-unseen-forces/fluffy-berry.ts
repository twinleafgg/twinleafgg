import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, CardType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  CheckRetreatCostEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import {IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { GameError, GameMessage, PlayerType } from '../../../game';
import { AttachPokemonToolEffect } from '../../../game/store/effects/play-card-effects';

export class FluffyBerry extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'UF';
  public name: string = 'Fluffy Berry';
  public fullName: string = 'Fluffy Berry UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';

  public text: string =
    "As long as Fluffy Berry is attached to a Pokémon, that Pokémon's Retreat Cost is 0.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckRetreatCostEffect && effect.player.active.tools.includes(this)) {
      const index = effect.cost.indexOf(CardType.COLORLESS);
      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        return state;
      }
      if (index !== -1) {
        effect.cost.splice(index, 99);
      }
    }

    if (effect instanceof AttachPokemonToolEffect && effect.trainerCard == this) {
      if (
        effect.target.getPokemonCard()?.hasTag(CardTag.POKEMON_ex) ||
        effect.target.getPokemonCard()?.hasTag(CardTag.DARK)
      ) {
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

          if (
            !!attachedTo &&
            (attachedTo.hasTag(CardTag.POKEMON_ex) || attachedTo.hasTag(CardTag.DARK))
          ) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}
