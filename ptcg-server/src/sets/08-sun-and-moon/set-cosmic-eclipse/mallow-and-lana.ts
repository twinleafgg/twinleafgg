import {
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  ConfirmPrompt,
  GameError,
  PlayerType,
  SlotType,
} from '../../../game';
import { GameLog, GameMessage } from '../../../game/game-message';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class MallowAndLana extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'CEC';

  protected _tags = [CardTag.TAG_TEAM];

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '198';

  public name: string = 'Mallow & Lana';

  public fullName: string = 'Mallow & Lana CEC';

  public text: string = `Switch your Active Pokémon with 1 of your Benched Pokémon. 

When you play this card, you may discard 2 other cards from your hand. If you do, heal 120 damage from the Pokémon you moved to your Bench.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const activeHasDamage = player.active.damage > 0;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      const benchedPokemon = player.bench.filter((b) => b.cards.length > 0).length;

      if (benchedPokemon === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (result) => {
          const cardList = result[0];
          const previousActiveCardList = player.active;

          player.switchPokemon(cardList);

          if (player.hand.cards.length < 2 || !activeHasDamage) {
            return state;
          }

          state = store.prompt(
            state,
            new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_HEAL_POKEMON),
            (wantToUse) => {
              if (wantToUse) {
                state = store.prompt(
                  state,
                  new ChooseCardsPrompt(
                    player,
                    GameMessage.CHOOSE_CARD_TO_DISCARD,
                    player.hand,
                    {},
                    { allowCancel: false, min: 2, max: 2 },
                  ),
                  (cards) => {
                    cards = cards || [];

                    MOVE_CARDS(store, state, player.hand, player.discard, {
                      cards,
                      sourceCard: this,
                    });

                    const healEffect = new HealEffect(player, previousActiveCardList, 120);
                    state = store.reduceEffect(state, healEffect);

                    store.log(state, GameLog.LOG_PLAYER_HEALS_POKEMON, {
                      name: player.name,
                      pokemon: previousActiveCardList.getPokemonCard()!.name,
                      healingAmount: 120,
                    });
                  },
                );
              }
            },
          );
        },
      );
    }

    return state;
  }
}
