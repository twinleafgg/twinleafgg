import {
  ChooseCardsPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PokemonCard,
  StateUtils,
} from '../../../game';
import { CardTag, EnergyType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class TeamMagmaConspirator extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '82';
  public name: string = 'Team Magma Conspirator';
  public fullName: string = 'Team Magma Conspirator MA';

  public text: string =
    'Search your deck for up to 2 in any combination of Basic Pokémon with Team Magma in its name and basic Energy cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          card.hasTag(CardTag.TEAM_MAGMA) &&
          card.stage === Stage.BASIC
        ) {
          return;
        } else if (card instanceof EnergyCard && card.energyType === EnergyType.BASIC) {
          return;
        } else {
          blocked.push(index);
        }
      });

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          {},
          { min: 0, max: 2, allowCancel: false, blocked },
        ),
        (selected) => {
          if (selected) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
      return state;
    }

    return state;
  }
}
