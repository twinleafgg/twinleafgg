import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { SuperType, TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, PokemonCard } from '../../../game';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { BLOCK_IF_NO_SLOTS, GET_PLAYER_BENCH_SLOTS, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HolonFossil extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;

  public set: string = 'HP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Holon Fossil';
  public fullName: string = 'Holon Fossil HP';

  public text: string =
    'Flip a coin. If heads, search your deck for an Omanyte, Kabuto, Aerodactyl, Aerodactyl ex, Lileep, or Anorith and put it onto your Bench. Shuffle your deck afterward. If tails, put an Omanyte, Kabuto, Aerodactyl, Aerodactyl ex, Lileep, or Anorith from your hand onto your Bench. Treat the new Benched Pokémon as a Basic Pokémon.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0 && player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const slots = GET_PLAYER_BENCH_SLOTS(player);
      BLOCK_IF_NO_SLOTS(slots);

      const blockedDeck: number[] = [];
      player.deck.cards.forEach((card, index) => {
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
          blockedDeck.push(index);
        }
      });

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

      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      return COIN_FLIP_PROMPT(store, state, player, (flipResult) => {
        if (flipResult) {
          SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(
            store,
            state,
            player,
            {},
            { min: 0, max: 1, blocked: blockedDeck },
          );
        } else if (!flipResult) {
          if (player.hand.cards.length === 0 || player.hand.cards.length === blockedHand.length) {
            return state;
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
      });
    }
    return state;
  }
}
