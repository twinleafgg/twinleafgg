import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, ChooseCardsPrompt, GameMessage, ShowCardsPrompt, StateUtils, GameError, CardList, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gothitelle extends PokemonCard {
  public regulationMark = 'G';
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Gothorita';
  public cardType: CardType[] = [P];
  public hp: number = 150;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Read the Stars',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, you may look at the top 2 cards of your opponent\'s deck and put 1 of them back. Put the other card on the bottom of their deck.'
  }];

  public attacks = [
    {
      name: 'Psych Out',
      cost: [P, C],
      damage: 120,
      text: 'Discard a random card from your opponent\'s hand.'
    }
  ];

  public set: string = 'PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '92';
  public name: string = 'Gothitelle';
  public fullName: string = 'Gothitelle PAL';

  public readonly READ_THE_STARS_MARKER = 'READ_THE_STARS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Read the Stars
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.deck.cards.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (HAS_MARKER(this.READ_THE_STARS_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let cards: Card[] = [];
      const deckTop = new CardList();
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 2, sourceCard: this });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ON_BOTTOM,
        deckTop,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        cards = selected || [];

        ABILITY_USED(player, this);
        ADD_MARKER(this.READ_THE_STARS_MARKER, player, this);

        MOVE_CARDS(store, state, deckTop, opponent.deck, { cards: cards, sourceCard: this });
        deckTop.moveToTopOfDestination(opponent.deck);
      });
    }

    // Psych Out
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        {},
        { allowCancel: false, min: 1, max: 1, isSecret: true }
      ), cards => {
        cards = cards || [];

        store.prompt(state, new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          cards
        ), () => []);

        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.READ_THE_STARS_MARKER, this);

    return state;
  }
}