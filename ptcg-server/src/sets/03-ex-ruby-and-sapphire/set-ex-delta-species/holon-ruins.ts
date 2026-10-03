import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt, GameError, PlayerType } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HolonRuins extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'DS';
  public name = 'Holon Ruins';
  public fullName = 'Holon Ruins DS';

  public text =
    'Each player that has any Pokémon in play that has delta on its card may draw a card once during his or her turn. If the player does, he or she discards a card from his or her hand.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      let deltaCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.hasTag(CardTag.DELTA_SPECIES)) {
          deltaCount++;
        }
      });

      if (deltaCount === 0) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      DRAW_CARDS(store, state, player, 1);
      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          effect.player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { allowCancel: false, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        },
      );
    }
    return state;
  }
}
