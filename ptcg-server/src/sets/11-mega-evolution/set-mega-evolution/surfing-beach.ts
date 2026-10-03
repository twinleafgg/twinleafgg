import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { CardTarget, ChoosePokemonPrompt, GameError, PlayerType, SlotType } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class SurfingBeach extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '129';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'MEG';
  public name = 'Surfing Beach';
  public fullName = 'Surfing Beach M1S';
  public regulationMark = 'I';
  public text =
    "Once during each player's turn, that player may switch their Active [W] Pokémon with 1 of their Benched [W] Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      let hasBenchWater = false;
      let hasActiveWater = false;
      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, cardTarget) => {
        const checkPokemonTypeEffect = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonTypeEffect);
        if (
          cardList === player.active &&
          checkPokemonTypeEffect.cardTypes.includes(CardType.WATER)
        ) {
          hasActiveWater = true;
        }
        if (
          cardList !== player.active &&
          checkPokemonTypeEffect.cardTypes.includes(CardType.WATER)
        ) {
          hasBenchWater = true;
        } else {
          blocked.push(cardTarget);
        }
      });

      if (!(hasActiveWater && hasBenchWater)) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, player.active, this)) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (selected) => {
          if (!selected || selected.length === 0) return state;
          const target = selected[0];
          if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, target, this)) {
            return state;
          }
          player.switchPokemon(target);
        },
      );
    }

    return state;
  }
}
