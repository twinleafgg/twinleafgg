import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
  ConfirmPrompt,
  ShowCardsPrompt,
  StateUtils,
  GameLog,
  PlayerType,
  TrainerCard,
} from '../../../game';
import {
  AFTER_ATTACK,
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
} from '../../../game/store/prefabs/prefabs';

export class EldegossV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V];

  public regulationMark = 'D';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 180;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Happy Match',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may put a Supporter card from your discard pile into your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Float Up',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      text: 'You may shuffle this Pokémon and all attached cards into your deck.',
    },
  ];

  public set: string = 'CPA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '5';

  public name: string = 'Eldegoss V';

  public fullName: string = 'Eldegoss V CPA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasSupporterInDiscard = player.discard.cards.some((c) => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER;
      });
      if (!hasSupporterInDiscard) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
              if (cardList.getPokemonCard() === this) {
                store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, {
                  name: player.name,
                  ability: 'Happy Match',
                });
              }
            });

            state = store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.discard,
                { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                { min: 1, max: 1, allowCancel: false },
              ),
              (selected) => {
                const cards = selected || [];
                if (cards.length > 0) {
                  store.prompt(
                    state,
                    [
                      new ShowCardsPrompt(
                        opponent.id,
                        GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                        cards,
                      ),
                    ],
                    () => {
                      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                        if (cardList.getPokemonCard() === this) {
                          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                        }
                      });

                      MOVE_CARDS(store, state, player.discard, player.hand, {
                        cards,
                        sourceCard: this,
                        sourceEffect: this.powers[0],
                      });
                    },
                  );
                }
              },
            );
          }
        },
      );
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, () => {
        const player = effect.player;
        player.active.clearEffects();
        MOVE_CARDS(store, state, player.active, player.deck, { sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
        });
      });
    }
    return state;
  }
}
