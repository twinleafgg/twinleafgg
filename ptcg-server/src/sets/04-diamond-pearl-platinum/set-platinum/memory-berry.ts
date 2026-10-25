import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PlayerType, PokemonCard, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonAttacksEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { IS_TOOL_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class MemoryBerry extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;
  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = 'Memory Berry';
  public fullName: string = 'Memory Berry PL';
  public text: string = 'Attach Memory Berry to 1 of your Pokémon that doesn\'t already have a Pokémon Tool attached to it. If that Pokémon is Knocked Out, discard this card. The Pokémon this card is attached to can use any attack from its Basic Pokémon or its Stage 1 Evolution card. (You still have to pay for that attack\'s Energy cost.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (!cardList.tools.includes(this)) {
            return;
          }
          if (IS_TOOL_BLOCKED(store, state, player, this)) {
            return;
          }
          player.showAllStageAbilities = true;
        });
      });
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (!cardList.tools.includes(this)) {
          return;
        }
        if (IS_TOOL_BLOCKED(store, state, player, this)) {
          return;
        }
        if (cardList !== player.active) {
          return;
        }

        for (const stacked of cardList.cards) {
          if (stacked.superType !== SuperType.POKEMON || stacked === card) {
            continue;
          }
          const pokemon = stacked as PokemonCard;
          if (pokemon.stage !== Stage.BASIC && pokemon.stage !== Stage.STAGE_1) {
            continue;
          }
          for (const attack of pokemon.attacks || []) {
            if (!effect.attacks.includes(attack)) {
              effect.attacks.push(attack);
            }
          }
        }
      });
    }

    return state;
  }
}
