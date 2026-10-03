import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { SupporterEffect, TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, Stage, TrainerType } from '../../../game/store/card/card-types';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  Card,
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  PlayerType,
  PokemonCard,
  SelectPrompt,
  SlotType,
  StateUtils,
} from '../../../game';

export class Serena extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '164';

  public regulationMark = 'F';

  public name: string = 'Serena';

  public fullName: string = 'Serena SIT';

  public text: string =
    'Choose 1:\n\n' +
    '• Discard up to 3 cards from your hand. (You must discard at least 1 card.) If you do, draw cards until you have 5 cards in your hand.\n' +
    "• Switch 1 of your opponent's Benched Pokémon V with their Active Pokémon. Shuffle the other cards back into your deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const options: { message: GameMessage; action: () => void }[] = [
        {
          message: GameMessage.DISCARD_AND_DRAW,
          action: () => {
            let cards: Card[] = [];

            return store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_DISCARD,
                player.hand,
                {},
                { min: 1, max: 3, allowCancel: true },
              ),
              (selected) => {
                cards = selected || [];
                MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

                while (player.hand.cards.length < 5) {
                  if (player.deck.cards.length === 0) {
                    break;
                  }
                  MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
                }
                return state;
              },
            );
          },
        },
        {
          message: GameMessage.SWITCH_POKEMON,
          action: () => {
            const blocked: CardTarget[] = [];
            opponent.bench.forEach((card, index) => {
              if (
                card instanceof PokemonCard &&
                !(
                  card.hasTag(CardTag.POKEMON_V) ||
                  card.hasTag(CardTag.POKEMON_VMAX) ||
                  card.hasTag(CardTag.POKEMON_VSTAR) ||
                  card.hasTag(CardTag.POKEMON_VUNION)
                )
              ) {
                blocked.push({ player: PlayerType.TOP_PLAYER, slot: SlotType.BENCH, index });
              }
            });

            return store.prompt(
              state,
              new ChoosePokemonPrompt(
                player.id,
                GameMessage.CHOOSE_POKEMON_TO_SWITCH,
                PlayerType.TOP_PLAYER,
                [SlotType.BENCH],
                { allowCancel: false, blocked: blocked },
              ),
              (result) => {
                const cardList = result && result[0];
                if (!cardList) {
                  return state;
                }

                if (cardList.isStage(Stage.BASIC)) {
                  try {
                    const supporterEffect = new SupporterEffect(player, effect.trainerCard);
                    store.reduceEffect(state, supporterEffect);
                  } catch {
                    return state;
                  }
                }

                if (
                  !cardList.getPokemonCard()?.hasTag(CardTag.POKEMON_V) &&
                  !cardList.getPokemonCard()?.hasTag(CardTag.POKEMON_VMAX) &&
                  !cardList.getPokemonCard()?.hasTag(CardTag.POKEMON_VSTAR)
                ) {
                  throw new GameError(GameMessage.INVALID_TARGET);
                }

                opponent.switchPokemon(cardList);

                return state;
              },
            );
          },
        },
      ];

      const hasBench = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasBench) {
        options.splice(1, 1);
      }

      const hasVPokeBench = opponent.bench.some(
        (b) =>
          b.getPokemonCard()?.hasTag(CardTag.POKEMON_V) ||
          b.getPokemonCard()?.hasTag(CardTag.POKEMON_VMAX) ||
          b.getPokemonCard()?.hasTag(CardTag.POKEMON_VSTAR),
      );

      if (!hasVPokeBench) {
        options.splice(1, 1);
      }

      let cards: Card[] = [];

      cards = player.hand.cards;
      if (cards.length < 1) {
        options.splice(0, 1);
      }

      if (player.deck.cards.length === 0) {
        options.splice(0, 1);
      }

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_OPTION,
          options.map((opt) => opt.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];
          option.action();
        },
      );
    }
    return state;
  }
}
