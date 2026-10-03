import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import {
  PlayerType,
  SlotType,
  StateUtils,
  CardTarget,
  GameMessage,
  PokemonCardList,
  ChooseCardsPrompt,
  Card,
  GameError,
  CardList,
} from '../../../game';
export class FanOfWaves extends TrainerCard {
  public regulationMark = 'E';

  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '127';

  public name: string = 'Fan of Waves';

  public fullName: string = 'Fan of Waves BST';

  public text: string =
    "Put a Special Energy attached to 1 of your opponent's Pokémon on the bottom of their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let hasPokemonWithEnergy = false;
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.cards.some((c) => c.superType === SuperType.ENERGY && EnergyType.SPECIAL)) {
          hasPokemonWithEnergy = true;
        } else {
          blocked.push(target);
        }
      });

      if (!hasPokemonWithEnergy) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let targets: PokemonCardList[] = [];
      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (results) => {
          targets = results || [];
        },
      );

      if (targets.length === 0) {
        return state;
      }

      const target = targets[0];
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          target,
          { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const cards = selected as Card[];

          const opponentDeckBottom = new CardList();
          cards.forEach((card) => {
            MOVE_CARDS(store, state, opponentDeckBottom, opponent.deck, {
              cards: [card],
              sourceCard: this,
            });
          });

          return state;
        },
      );
      return state;
    }
    return state;
  }
}
