import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { GameError, GameMessage, Player } from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Grusha extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '184';

  public name: string = 'Grusha';

  public fullName: string = 'Grusha PAL';

  public text: string =
    'Draw cards until you have 5 cards in your hand. If none of your Pokémon have any Energy attached, draw cards until you have 7 cards in your hand instead.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return player.deck.cards.length > 0;
  }

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

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergyEffect);
      const energyCount = checkProvidedEnergyEffect.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      if (energyCount === 0) {
        while (player.hand.cards.length < 7) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
      } else {
        while (player.hand.cards.length < 5) {
          if (player.deck.cards.length === 0) {
            break;
          }
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
        }
        return state;
      }
      return state;
    }
    return state;
  }
}
