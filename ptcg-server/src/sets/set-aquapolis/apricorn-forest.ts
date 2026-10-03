import { GameError } from '../../game/game-error';
import { GameMessage } from '../../game/game-message';
import { StateUtils } from '../../game/store/state-utils';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { EnergyType, Stage, SuperType, TrainerType } from '../../game/store/card/card-types';
import { UseStadiumEffect } from '../../game/store/effects/game-effects';
import {
  Card,
  ChooseCardsPrompt,
  EnergyCard,
  PokemonCard,
  PokemonCardList,
  ShuffleDeckPrompt,
  pokemonHasCardType,
} from '../../game';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../game/store/effects/play-card-effects';
import { COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ApricornForest extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '118';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'AQ';
  public name = 'Apricorn Forest';
  public fullName = 'Apricorn Forest AQ';

  public text =
    "Once during each player's turn (before attacking), if that player's Bench isn't full, that player flips a coin. If heads, that player shows his or her opponent a basic Energy card from his or her hand. Then, that player searches his or her deck for a Basic Pokémon card of the same type (color) as the revealed Energy card and puts it onto his or her Bench. The player shuffles his or her deck afterward.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      if (
        player.hand.cards.filter(
          (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
        ).length === 0
      ) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }
      if (slots.length == 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      } else {
        COIN_FLIP_PROMPT(store, state, player, (result) => {
          if (result) {
            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARDS,
                player.hand,
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selectedCards) => {
                const energyCard = selectedCards[0] as EnergyCard;
                const energyColor = energyCard.provides[0];

                MOVE_CARDS(store, state, player.hand, player.deck, { cards: [energyCard] });

                const blocked: number[] = [];
                player.deck.cards.forEach((card, index) => {
                  if (!(card instanceof PokemonCard)) {
                    blocked.push(index);
                  }
                  if (card instanceof PokemonCard && !pokemonHasCardType(card, energyColor)) {
                    blocked.push(index);
                  }
                });

                let cards: Card[] = [];
                store.prompt(
                  state,
                  new ChooseCardsPrompt(
                    player,
                    GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
                    player.deck,
                    { superType: SuperType.POKEMON, stage: Stage.BASIC },
                    { min: 0, max: 1, allowCancel: false, blocked },
                  ),
                  (selectedCards) => {
                    cards = selectedCards || [];

                    // Operation canceled by the user
                    if (cards.length === 0) {
                      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                        player.deck.applyOrder(order);
                      });
                    } else {
                      cards.forEach((card, index) => {
                        store.reduceEffect(
                          state,
                          new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
                        );
                      });
                    }
                    return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                      player.deck.applyOrder(order);
                    });
                  },
                );
              },
            );
          }
        });
      }
    }

    return state;
  }
}
