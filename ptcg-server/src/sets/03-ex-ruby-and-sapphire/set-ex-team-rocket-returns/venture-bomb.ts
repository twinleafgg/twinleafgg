import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';

export class VentureBomb extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  protected _tags = [CardTag.ROCKETS_SECRET_MACHINE];

  public set: string = 'TRR';
  public name: string = 'Venture Bomb';
  public fullName: string = 'Venture Bomb TRR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';

  public text: string =
    "Flip a coin. If heads, put 1 damage counter on 1 of your opponent's Pokémon. If tails, put 1 damage counter on 1 of your Pokémon.";

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
                target.damage += 10;
              });
            },
          );
        }

        if (!result) {
          return store.prompt(
            state,
            new ChoosePokemonPrompt(
              player.id,
              GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE, SlotType.BENCH],
              { min: 1, max: 1, allowCancel: false },
            ),
            (selected) => {
              const targets = selected || [];
              targets.forEach((target) => {
                target.damage += 10;
              });
            },
          );
        }
      });

      MOVE_CARDS(store, state, player.supporter, player.discard, { sourceCard: this });

      return state;
    }

    return state;
  }
}
