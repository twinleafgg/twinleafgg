import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { CardList, ConfirmPrompt, GameError, GameMessage, ShowCardsPrompt, StateUtils } from '../../../game';
import {SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lanturn extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Chinchou';
  public cardType: CardType[] = [L];
  public hp: number = 110;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Blinking lights',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'As often as you like during your turn (before your attack), you may look at the top card of your opponent\'s deck.'
  }];

  public attacks = [{
    name: 'Swirling Flow',
    cost: [L, C],
    damage: 50,
    text: 'You may have your opponent shuffle their deck.'
  }];

  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Lanturn';
  public fullName: string = 'Lanturn CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 1, sourceCard: this });

      state = store.prompt(state, new ShowCardsPrompt(
        player.id,
        GameMessage.CARDS_SHOWED_BY_EFFECT,
        deckTop.cards,
      ), () => {
        // Move the card back to the top of the deck
        MOVE_CARDS(store, state, deckTop, opponent.deck, { count: 0, sourceCard: this }); // Ensure the card is placed back on top of the deck
        opponent.deck.cards = deckTop.cards.concat(opponent.deck.cards);
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK,
      ), wantToUse => {
        if (wantToUse) {
          SHUFFLE_DECK(store, state, opponent);
        }
      });
    }
    return state;
  }
}