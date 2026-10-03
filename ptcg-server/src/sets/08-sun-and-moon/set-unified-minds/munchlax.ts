import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { Card, CardList, ChooseCardsPrompt, GameMessage, PowerType, ShowCardsPrompt, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {BLOCK_IF_DISCARD_EMPTY, IS_ABILITY_BLOCKED, WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Munchlax extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;

  public powers = [{
    name: 'Snack Search',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: ' Once during your turn (before your attack), you may flip a coin.'
    + 'If heads, put a card from your discard pile on top of your deck. If you use this Ability, your turn ends. '
  }];

  public set = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '173';
  public name = 'Munchlax';
  public fullName = 'Munchlax UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let cards: Card[] = [];

      BLOCK_IF_DISCARD_EMPTY(player);

      // Checking to see if ability is being blocked
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      COIN_FLIP_PROMPT(store, state, player, result => {

        if (result) {
          const deckTop = new CardList();

          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARDS_TO_PUT_ON_TOP_OF_THE_DECK,
            player.discard,
            {},
            { min: 1, max: 1, allowCancel: false }
          ), selected => {
            cards = selected || [];

            MOVE_CARDS(store, state, player.discard, deckTop, { cards: cards, sourceCard: this });
            deckTop.moveToTopOfDestination(player.deck);

            if (cards.length > 0) {
              return store.prompt(state, new ShowCardsPrompt(
                opponent.id,
                GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                cards
              ), () => {
                return state;
              });
            }

            MOVE_CARDS(store, state, player.deck, deckTop, { cards: cards, sourceCard: this });
          });
        }
      });

      const endTurnEffect = new EndTurnEffect(player);
      store.reduceEffect(state, endTurnEffect);
      return state;

    }

    return state;
  }
}