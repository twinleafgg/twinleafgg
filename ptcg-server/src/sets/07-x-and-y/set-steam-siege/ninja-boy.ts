import {
  Card,
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  PlayerType,
  ShuffleDeckPrompt,
  SlotType,
} from '../../../game';
import { GameLog, GameMessage } from '../../../game/game-message';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NinjaBoy extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'STS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '103';

  public name: string = 'Ninja Boy';

  public fullName: string = 'Ninja Boy STS';

  public text: string =
    'Choose 1 of your Basic Pokémon in play. Search your deck for a Basic Pokémon and switch it with that Pokémon. (Any attached cards, damage counters, Special Conditions, turns in play, and any other effects remain on the new Pokémon.) Shuffle the first Pokémon into your deck.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card.stage !== Stage.BASIC) {
          blocked.push(target);
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (results) => {
          const target = results || [];

          if (target.length === 0) {
            return state;
          }

          let cards: Card[] = [];
          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
              player.deck,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 1, max: 1, allowCancel: false },
            ),
            (selectedCards) => {
              cards = selectedCards || [];

              if (cards.length === 0) {
                return state;
              }

              cards.forEach((card, index) => {
                MOVE_CARDS(store, state, target[0], player.deck, {
                  cards: [card],
                  sourceCard: this,
                });
                MOVE_CARDS(store, state, player.deck, target[0], {
                  cards: [card],
                  sourceCard: this,
                });
              });

              store.log(state, GameLog.LOG_PLAYER_SWITCHES_POKEMON_WITH_POKEMON_FROM_DECK, {
                name: player.name,
                card: target[0].getPokemonCard()!.name,
                secondCard: cards[0].name,
              });

              return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                player.deck.applyOrder(order);
              });
            },
          );
        },
      );
    }

    return state;
  }
}
