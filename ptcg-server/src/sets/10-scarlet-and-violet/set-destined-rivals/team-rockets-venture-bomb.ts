import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChoosePokemonPrompt, Player, PlayerType, SlotType } from '../../../game';

export class TeamRocketsVentureBomb extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TEAM_ROCKET];
  public set: string = 'DRI';
  public regulationMark = 'I';
  public name: string = "Team Rocket's Venture Bomb";
  public fullName: string = "Team Rocket's Venture Bomb DRI";
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '179';

  public text: string =
    "Flip a coin. If heads, put 2 damage counters on 1 of your opponent's Pokémon. If tails, put 2 damage counters on your Active Pokémon.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
              PlayerType.TOP_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { min: 1, max: 1, allowCancel: false },
            ),
            (selected) => {
              const targets = selected || [];
              targets.forEach((target) => {
                target.damage += 20;
              });
            },
          );
        }

        if (!result) {
          player.active.damage += 20;
          return state;
        }
      });

      MOVE_CARDS(store, state, player.supporter, player.discard, { sourceCard: this });

      return state;
    }

    return state;
  }
}
