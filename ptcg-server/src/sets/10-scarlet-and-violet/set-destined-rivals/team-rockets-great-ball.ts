import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  Card,
  ChooseCardsPrompt,
  Player,
  PokemonCard,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
  StateUtils,
} from '../../../game';
import { MOVE_CARDS, COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';

export class TeamRocketsGreatBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '175';

  public regulationMark = 'I';

  public name: string = "Team Rocket's Great Ball";
  public fullName: string = "Team Rocket's Great Ball DRI";

  public text: string =
    'Flip a coin. If heads, search your deck for an Evolution Team Rocket Pokémon, reveal it, and put it into your hand. If tails, search your deck for a Basic Team Rocket Pokémon, reveal it, and put it into your hand. Then, shuffle your deck.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.deck.cards.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          (card.stage === Stage.BASIC || !card.hasTag(CardTag.TEAM_ROCKET))
        ) {
          blocked.push(index);
        }
      });

      const blocked2: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          (card.stage !== Stage.BASIC || !card.hasTag(CardTag.TEAM_ROCKET))
        ) {
          blocked2.push(index);
        }
      });

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return COIN_FLIP_PROMPT(store, state, player, (flipResult) => {
        if (flipResult) {
          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_HAND,
              player.deck,
              { superType: SuperType.POKEMON },
              { min: 0, max: 1, allowCancel: false, blocked },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              // Operation canceled by the user
              if (cards.length === 0) {
                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              }

              if (cards.length > 0) {
                state = store.prompt(
                  state,
                  new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                  () => state,
                );
              }

              // Operation canceled by the user
              if (cards.length === 0) {
                return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              }

              if (cards.length > 0) {
                state = store.prompt(
                  state,
                  new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
                  () => state,
                );
              }
              cards.forEach((card) => {
                MOVE_CARDS(store, state, player.deck, player.hand, {
                  cards: [card],
                  sourceCard: this,
                });
              });
              return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
              });
            },
          );
        }
        return state;
      });
    }
    return state;
  }
}
