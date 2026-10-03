import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';
import { UseStadiumEffect, HealEffect } from '../../../game/store/effects/game-effects';
import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';

export class PokemonCenter extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'NXD';
  public name: string = 'Pokémon Center';
  public fullName: string = 'Pokemon Center NXD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '90';
  public text: string =
    "Once during each player's turn, that player may heal 20 damage from 1 of his or her Benched Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      const blocked: CardTarget[] = [];
      let hasPokemonWithDamage: boolean = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList === player.active) {
          return;
        }
        if (cardList.damage === 0) {
          blocked.push(target);
        } else {
          hasPokemonWithDamage = true;
        }
      });

      if (hasPokemonWithDamage === false) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: true, blocked },
        ),
        (results) => {
          const targets = results || [];

          if (targets.length === 0) {
            return state;
          }

          targets.forEach((target) => {
            const owner = StateUtils.findOwner(state, target);
            if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, target)) {
              return;
            }

            // Heal Pokemon
            const healEffect = new HealEffect(player, target, 20);
            store.reduceEffect(state, healEffect);
          });
        },
      );
    }

    return state;
  }
}
