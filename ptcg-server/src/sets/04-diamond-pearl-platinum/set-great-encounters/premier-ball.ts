import {
  CardTag,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  PokemonCard,
  SelectOptionPrompt,
  Stage,
  State,
  StoreLike,
  SuperType,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';

export class PremierBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public name: string = 'Premier Ball';
  public fullName: string = 'Premier Ball GE';

  public text: string =
    'Search your deck or your discard pile for a Pokémon LV.X, show it to your opponent, and put it into your hand. ' +
    'If you search your deck, shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const lvxInDiscard = player.discard.cards.some(
        (c) => c instanceof PokemonCard && c.hasTag(CardTag.POKEMON_LV_X),
      );

      if (player.deck.cards.length === 0 && !lvxInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      effect.preventDefault = true;

      const options: { message: GameMessage; action: () => void }[] = [];

      if (player.deck.cards.length > 0) {
        options.push({
          message: GameMessage.CHOOSE_CARD_FROM_DECK,
          action: () => {
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
                const cards = selected || [];
                MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this });
                SHOW_CARDS_TO_PLAYER(store, state, player, cards);
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
                const cards = selected || [];
                MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: this });
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
            { allowCancel: true },
          ),
          (choice) => {
            options[choice].action();
          },
        );
      }
    }

    return state;
  }
}
