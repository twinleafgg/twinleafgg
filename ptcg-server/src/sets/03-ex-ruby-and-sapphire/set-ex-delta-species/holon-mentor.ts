import { GameError, GameMessage, PokemonCard } from '../../../game';
import { CardTag, Stage, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_CARDS_FROM_YOUR_HAND } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class HolonMentor extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  protected _tags = [CardTag.DELTA_SPECIES];
  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '93';
  public name: string = 'Holon Mentor';
  public fullName: string = 'Holon Mentor DS';

  public text: string =
    "Discard a card from your hand. If you can't discard a card from your hand, you can't play this card.\n\nSearch your deck for up to 3 Basic Pokémon that each has 100 HP or less, show them to your opponent, and put them into your hand. Shuffle your deck afterward.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;
      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      DISCARD_X_CARDS_FROM_YOUR_HAND(effect, store, state, 1, 1);

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });
      effect.preventDefault = true;

      const blocked = player.deck.cards.reduce((acc, c, index) => {
        if (!(c instanceof PokemonCard && c.stage === Stage.BASIC && c.hp <= 100)) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);

      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        player,
        {},
        { min: 0, max: 3, allowCancel: false, blocked },
      );
      return state;
    }

    return state;
  }
}
