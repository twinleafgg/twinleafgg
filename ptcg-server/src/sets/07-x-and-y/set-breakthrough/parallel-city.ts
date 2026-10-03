import { SelectPrompt, StadiumDirection } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PlayStadiumEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ParallelCity extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'BKT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '145';
  public name: string = 'Parallel City';
  public fullName: string = 'Parallel City BKT';
  public text: string =
    "Choose which way this card faces before you play it. This ↓ player can't have more than 3 Benched Pokémon. (When this card comes into play, this ↓ player discards Benched Pokémon until he or she has 3 Pokémon on the Bench.)\n\n" +
    "Choose which way this card faces before you play it. Any damage done by attacks from this ↓ player's [G] [R] or [W] Pokémon is reduced by 20 (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayStadiumEffect && effect.trainerCard === this) {
      const player = effect.player;

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.UP,
          action: () => {
            const stadiumCard = StateUtils.getStadiumCard(state);
            if (stadiumCard !== undefined) {
              StateUtils.findCardList(state, stadiumCard).stadiumDirection = StadiumDirection.UP;
            }
          },
        },
        {
          message: GameMessage.DOWN,
          action: () => {
            const stadiumCard = StateUtils.getStadiumCard(state);
            if (stadiumCard !== undefined) {
              StateUtils.findCardList(state, stadiumCard).stadiumDirection = StadiumDirection.DOWN;
            }
          },
        },
      ];

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.WHICH_DIRECTION_TO_PLACE_STADIUM,
          options.map((c) => c.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          if (option.action) {
            option.action();
          }
          return state;
        },
      );
    }

    if (effect instanceof CheckTableStateEffect && StateUtils.getStadiumCard(state) === this) {
      const stadiumCardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, stadiumCardList);
      const limitedIsOwner = stadiumCardList.stadiumDirection === StadiumDirection.DOWN;

      effect.benchSizes = state.players.map((p) => {
        const isLimited = limitedIsOwner ? p === owner : p !== owner;
        return isLimited ? 3 : 5;
      });
    }

    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const stadiumCardList = StateUtils.findCardList(state, this);
      const stadiumOwner = StateUtils.findOwner(state, stadiumCardList);
      const attackerTypes = effect.player.active.getPokemonCard()?.cardType ?? [];
      const isGrw = attackerTypes.some(
        (t) => t === CardType.FIRE || t === CardType.WATER || t === CardType.GRASS,
      );
      const affectsAttacker =
        (effect.player === stadiumOwner &&
          stadiumCardList.stadiumDirection === StadiumDirection.UP) ||
        (effect.player !== stadiumOwner &&
          stadiumCardList.stadiumDirection === StadiumDirection.DOWN);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, effect.player, effect.source)) {
        return state;
      }

      if (isGrw && affectsAttacker) {
        effect.damage -= 20;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
