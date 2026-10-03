import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Mantine extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 110;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [];

  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Borne Ashore',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Put a Basic Pokémon from either player\'s discard pile onto that player\'s Bench.'
  },
  {
    name: 'Aqua Edge',
    cost: [CardType.WATER, CardType.WATER, CardType.COLORLESS],
    damage: 100,
    text: ''
  }];

  public regulationMark = 'F';

  public set: string = 'ASR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '34';

  public name: string = 'Mantine';

  public fullName: string = 'Mantine ASR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Borne Ashore: Put a Basic Pokemon from either player's discard pile onto that player's Bench.
    // Ref: set-guardians-rising/alomomola.ts (same attack text, same pattern)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerHasBasics = player.discard.cards.some(c =>
        c instanceof PokemonCard && c.stage === Stage.BASIC
      );
      const opponentHasBasics = opponent.discard.cards.some(c =>
        c instanceof PokemonCard && c.stage === Stage.BASIC
      );

      if (!playerHasBasics && !opponentHasBasics) {
        return state;
      }

      const playerHasSpace = player.bench.some(b => b.cards.length === 0);
      const opponentHasSpace = opponent.bench.some(b => b.cards.length === 0);

      // Offer player's discard first (with cancel if opponent's discard is also an option)
      if (playerHasBasics && playerHasSpace) {
        let cards: Card[] = [];
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 1, max: 1, allowCancel: opponentHasBasics && opponentHasSpace }
        ), selected => {
          cards = selected || [];
          if (cards.length > 0) {
            const slot = player.bench.find(b => b.cards.length === 0);
            if (slot) {
              MOVE_CARDS(store, state, player.discard, slot, { cards: [cards[0]], sourceCard: this });
              slot.pokemonPlayedTurn = state.turn;
            }
          } else if (opponentHasBasics && opponentHasSpace) {
            // Player chose to use opponent's discard instead
            store.prompt(state, new ChooseCardsPrompt(
              player,
              GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
              opponent.discard,
              { superType: SuperType.POKEMON, stage: Stage.BASIC },
              { min: 1, max: 1, allowCancel: false }
            ), selected2 => {
              const cards2 = selected2 || [];
              if (cards2.length > 0) {
                const slot = opponent.bench.find(b => b.cards.length === 0);
                if (slot) {
                  MOVE_CARDS(store, state, opponent.discard, slot, { cards: [cards2[0]], sourceCard: this });
                  slot.pokemonPlayedTurn = state.turn;
                }
              }
            });
          }
        });
      }

      // Only opponent's discard has basics with available bench space
      if (opponentHasBasics && opponentHasSpace) {
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          opponent.discard,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length > 0) {
            const slot = opponent.bench.find(b => b.cards.length === 0);
            if (slot) {
              MOVE_CARDS(store, state, opponent.discard, slot, { cards: [cards[0]], sourceCard: this });
              slot.pokemonPlayedTurn = state.turn;
            }
          }
        });
      }
    }

    return state;
  }
}
