import { SelectPrompt, StadiumDirection } from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { PlayStadiumEffect } from '../../../game/store/effects/play-card-effects';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ReverseValley extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public set: string = 'BKP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '110';
  public name: string = 'Reverse Valley';
  public fullName: string = 'Reverse Valley BKP';
  public text: string =
    "Choose which way this card faces before you play it. The attacks of this ↓ player's [D] Pokémon do 10 more damage to your opponent's Active Pokémon (before applying Weakness and Resistance).\n\n" +
    "Choose which way this card faces before you play it. Any damage done to this ↓ player's [M] Pokémon by an opponent's attack is reduced by 10 (after applying Weakness and Resistance).";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayStadiumEffect && effect.trainerCard === this) {
      const player = effect.player;

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.UP,
          action: () => {
            const stadiumCard = StateUtils.getStadiumCard(state);
            if (stadiumCard !== undefined) {
              const cardList = StateUtils.findCardList(state, stadiumCard);
              cardList.stadiumDirection = StadiumDirection.UP;
            }
          },
        },
        {
          message: GameMessage.DOWN,
          action: () => {
            const stadiumCard = StateUtils.getStadiumCard(state);
            if (stadiumCard !== undefined) {
              const cardList = StateUtils.findCardList(state, stadiumCard);
              cardList.stadiumDirection = StadiumDirection.DOWN;
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

    if (effect instanceof PutDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const owner = StateUtils.findOwner(state, effect.target);
      const stadiumCardList = StateUtils.findCardList(state, this);
      const stadiumOwner = StateUtils.findOwner(state, stadiumCardList);

      const checkDefenderType = new CheckPokemonTypeEffect(effect.target);

      if (IS_STADIUM_EFFECT_BLOCKED(store, state, owner, effect.target)) {
        return state;
      }

      store.reduceEffect(state, checkDefenderType);

      if (!checkDefenderType.cardTypes.includes(CardType.METAL)) {
        return state;
      }

      // ↓ player's Metal Pokémon take 10 less damage from opponent's attacks
      if (
        (stadiumCardList.stadiumDirection === StadiumDirection.UP &&
          stadiumOwner !== effect.player) ||
        (stadiumCardList.stadiumDirection === StadiumDirection.DOWN &&
          stadiumOwner === effect.player)
      ) {
        effect.reduceDamage(10);
      }
    }

    if (effect instanceof DealDamageEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const stadiumCardList = StateUtils.findCardList(state, this);
      const stadiumOwner = StateUtils.findOwner(state, stadiumCardList);
      const checkPokemonType = new CheckPokemonTypeEffect(player.active);

      if (
        effect.target !== opponent.active ||
        effect.damage <= 0 ||
        IS_STADIUM_EFFECT_BLOCKED(store, state, player, effect.source)
      ) {
        return state;
      }

      store.reduceEffect(state, checkPokemonType);

      if (!checkPokemonType.cardTypes.includes(CardType.DARK)) {
        return state;
      }

      // ↓ player's Dark attacks do 10 more to the opponent's Active
      if (
        (stadiumCardList.stadiumDirection === StadiumDirection.UP && stadiumOwner === player) ||
        (stadiumCardList.stadiumDirection === StadiumDirection.DOWN && stadiumOwner !== player)
      ) {
        effect.damage += 10;
      }
    }

    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      throw new GameError(GameMessage.CANNOT_USE_STADIUM);
    }

    return state;
  }
}
