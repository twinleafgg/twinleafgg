import { GameError, PokemonCard, SelectOptionPrompt } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { Card } from '../../../game/store/card/card';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class PremierBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public name: string = 'Premier Ball';
  public fullName: string = 'Premier Ball GE';

  public text: string =
    'Search your deck or your discard pile for a Pokémon LV.X, show it to your opponent, and put it into your hand. If you search your deck, shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const lvxInDiscard = player.discard.cards.some(
        (c) => c instanceof PokemonCard && c.hasTag(CardTag.POKEMON_LV_X),
      );

      if (player.deck.cards.length === 0 && lvxInDiscard === false) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const options: { message: GameMessage; action: () => void }[] = [];

      if (player.deck.cards.length > 0) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DECK,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                { superType: SuperType.POKEMON, stage: Stage.LV_X },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                cards = selected || [];
                SHOW_CARDS_TO_PLAYER(store, state, player, cards);

                MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

                SHUFFLE_DECK(store, state, player);
              },
            );
          },
        });
      }

      if (lvxInDiscard) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DISCARD,
          action: () => {
            let cards: Card[] = [];

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.POKEMON, stage: Stage.LV_X },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                cards = selected || [];

                MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });

                return state;
              },
            );
          },
        });
      }

      if (options.length === 1) {
        options[0].action();
      } else {
        return store.prompt(
          state,
          new SelectOptionPrompt(
            player.id,
            GameMessage.CHOOSE_OPTION,
            ['Search your deck for a Pokémon LV.X', 'Search your discard pile for a Pokémon LV.X'],
            {
              allowCancel: true,
            },
          ),
          (choice) => {
            const option = options[choice];
            option.action();
          },
        );
      }
    }
    return state;
  }
}
