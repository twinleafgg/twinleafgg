import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt, GameError, PokemonCard } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {BLOCK_IF_NO_SLOTS, GET_PLAYER_BENCH_SLOTS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class StrangeCave extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  protected _trainerType = TrainerType.STADIUM;
  public set = 'LM';
  public name = 'Strange Cave';
  public fullName = 'Strange Cave LM';

  public text =
    "Once during each player's turn, that player may put an Omanyte, Kabuto, Aerodactyl, Aerodactyl ex, Lileep, or Anorith onto his or her Bench from his or her hand. Treat the new Benched Pokémon as Basic Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;

      const slots = GET_PLAYER_BENCH_SLOTS(player);
      BLOCK_IF_NO_SLOTS(slots);

      const blockedHand: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          (card.name === 'Omanyte' ||
            card.name === 'Kabuto' ||
            card.name === 'Aerodactyl' ||
            card.name === 'Aerodactyl ex' ||
            card.name === 'Lileep' ||
            card.name === 'Anorith')
        ) {
          return;
        } else {
          blockedHand.push(index);
        }
      });

      if (player.hand.cards.length === 0 || player.hand.cards.length === blockedHand.length) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.hand,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: false, blocked: blockedHand }
      ), selected => {
        const cards = selected || [];
        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, player.hand, slots[index], { cards: [card], sourceCard: this });
          slots[index].pokemonPlayedTurn = state.turn;
        });
      });
    }
    return state;
  }
}
