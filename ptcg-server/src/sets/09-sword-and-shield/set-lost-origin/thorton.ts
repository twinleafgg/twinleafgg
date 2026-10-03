import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { BoardEffect, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameError,
  PlayerType,
  PokemonCard,
  SlotType,
} from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Thorton extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'LOR';

  public regulationMark = 'F';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '167';

  public name: string = 'Thorton';

  public fullName: string = 'Thorton LOR';

  public text: string =
    'Choose a Basic Pokémon in your discard pile and switch it with 1 of your Basic Pokémon in play. Any attached cards, damage counters, Special Conditions, turns in play, and any other effects remain on the new Pokémon. You may play only 1 Supporter card during your turn.';

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

      const hasBasicInDiscard = player.discard.cards.some((c) => {
        return c instanceof PokemonCard && Stage.BASIC;
      });
      if (!hasBasicInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.stage !== Stage.BASIC) {
          blocked.push();
        }
      });

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const targets = selected || [];
          if (targets.length === 0) {
            throw new GameError(GameMessage.INVALID_TARGET);
          }

          return store.prompt(
            state,
            new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
              player.discard,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 1, max: 1, allowCancel: false },
            ),
            (selectedCards) => {
              const card = selectedCards[0];
              if (!card) {
                throw new GameError(GameMessage.INVALID_TARGET);
              }
              // Move the first selected Pokémon to the discard pile
              const targetList = targets[0];

              player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                targetList.removeBoardEffect(BoardEffect.ABILITY_USED);
              });

              MOVE_CARDS(store, state, targetList, player.discard, {
                cards: [targetList.cards[0]],
                sourceCard: this,
              });

              // Move the selected card from the discard to the target slot
              MOVE_CARDS(store, state, player.discard, targetList, {
                cards: [card],
                sourceCard: this,
              });

              // Move Thorton to the discard pile
            },
          );
        },
      );
    }
    return state;
  }
}
