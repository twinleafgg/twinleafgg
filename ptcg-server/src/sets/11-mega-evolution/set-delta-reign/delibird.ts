import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, SuperType, CardList, ChooseCardsPrompt, ShowCardsPrompt, StateUtils } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK } from "../../../game/store/prefabs/prefabs";

export class Delibird extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Energizing Present',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if this Pokémon is in the Active Spot, you may use this Ability. Look at the top 6 cards of your deck, reveal an Energy card you find there, and put it into your hand. Shuffle the other cards and put them on the bottom of your deck.'
  }];

  public attacks = [{
    name: 'Beat',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public regulationMark = 'J';
  public set: string = 'DLR';
  public setNumber: string = '79';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Delibird';
  public fullName: string = 'Delibird MEE';

  public readonly ENERGY_PRESENT_MARKER = 'DELIBIRD_MEE_ENERGY_PRESENT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Present
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ENERGY_PRESENT_MARKER, this);
      ABILITY_USED(player, this);

      state = this.lookAtTopCards(store, state, player);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ENERGY_PRESENT_MARKER, this);

    return state;
  }

  private lookAtTopCards(store: StoreLike, state: State, player: State['players'][number]): State {
    if (player.deck.cards.length === 0) {
      return state;
    }

    const topCards = new CardList();
    const count = Math.min(6, player.deck.cards.length);
    state = MOVE_CARDS(store, state, player.deck, topCards, { count, sourceCard: this });

    // Always show the looked-at cards, even when none of them are Energy.
    return store.prompt(state, new ShowCardsPrompt(player.id, GameMessage.CARDS_SHOWED_BY_EFFECT, topCards.cards), () => {
      const blocked: number[] = [];
      topCards.cards.forEach((card, index) => {
        if (card.superType !== SuperType.ENERGY) {
          blocked.push(index);
        }
      });

      if (blocked.length === topCards.cards.length) {
        this.putRemainingOnBottom(store, state, player, topCards);
        return;
      }

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          topCards,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: 1, blocked },
        ),
        (cards) => {
          const chosenCard = (cards || [])[0];

          if (chosenCard) {
            MOVE_CARDS(store, state, topCards, player.hand, { cards: [chosenCard], sourceCard: this });
            SHOW_CARDS_TO_PLAYER(store, state, StateUtils.getOpponent(state, player), [chosenCard]);
          }

          this.putRemainingOnBottom(store, state, player, topCards);
        },
      );
    });
  }

  private putRemainingOnBottom(store: StoreLike, state: State, player: State['players'][number], topCards: CardList): void {
    state = SHUFFLE_DECK(store, state, player);
    MOVE_CARDS(store, state, topCards, player.deck, { toBottom: true, sourceCard: this });
  }
}
