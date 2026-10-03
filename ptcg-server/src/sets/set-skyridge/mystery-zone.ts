import { GameMessage } from '../../game/game-message';
import { StateUtils } from '../../game/store/state-utils';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../game/store/card/card-types';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import { Card, GameError, PokemonCard } from '../../game';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../game/store/prompts/show-cards-prompt';
import { ShuffleDeckPrompt } from '../../game/store/prompts/shuffle-prompt';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class MysteryZone extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '137';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'SK';
  public name = 'Mystery Zone';
  public fullName = 'Mystery Zone SK';

  public text =
    "Once during each player's turn (before he or she attacks), if that player has an Evolution card in his or her hand, he or she may search his or her deck for a basic Energy card, show it to his or her opponent, and put it into his or her hand. Then that player chooses an Evolution card from his or her hand, shows it to his or her opponent, and puts it into his or her deck. That player shuffles his or her deck afterward.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let cards: Card[] = [];

      if (!player.hand.cards.some((c) => c instanceof PokemonCard && c.evolvesFrom !== '')) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];

          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          if (cards.length > 0) {
            state = store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {},
            );
          }

          const blocked: number[] = [];
          player.hand.cards.forEach((card, index) => {
            if (card instanceof PokemonCard && card.evolvesFrom === '') {
              blocked.push(index);
            }
          });

          state = store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_DECK,
              player.hand,
              { superType: SuperType.POKEMON },
              { min: 1, max: 1, allowCancel: false, blocked },
            ),
            (selectedToDeck) => {
              const evolutionCards = selectedToDeck || [];

              if (evolutionCards.length > 0) {
                state = store.prompt(
                  state,
                  new ShowCardsPrompt(
                    opponent.id,
                    GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                    evolutionCards,
                  ),
                  () => {},
                );
                MOVE_CARDS(store, state, player.hand, player.deck, {
                  cards: evolutionCards,
                  sourceCard: this,
                });
              }

              state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
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
