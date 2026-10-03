import {
  Attack,
  CardTag,
  CardType,
  GameError,
  GameMessage,
  PokemonCard,
  PokemonCardList,
  Power,
  PowerType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  Weakness,
  CardList,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  BLOCK_IF_DECK_EMPTY,
  GET_CARDS_ON_BOTTOM_OF_DECK,
  MOVE_CARDS,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class MistysPsyduck extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.MISTYS];
  public cardType: CardType[] = [W];
  public hp: number = 50;
  public weakness: Weakness[] = [{ type: L }];
  public retreat: CardType[] = [C];

  public powers: Power[] = [
    {
      name: 'Slapstick Jump',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text:
        'Once during your turn, if this Pokémon is on your Bench, you may discard the bottom card ' +
        'of your deck. If you do, discard all cards attached to this Pokémon and put it on top of your deck.',
    },
  ];

  public attacks: Attack[] = [{ name: 'Sprinkle Water', cost: [W], damage: 30, text: '' }];

  public set: string = 'DRI';
  public regulationMark: string = 'I';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = "Misty's Psyduck";
  public fullName: string = "Misty's Psyduck DRI";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      BLOCK_IF_DECK_EMPTY(player);

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      if (player.active.cards.includes(this) || opponent.active.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, player.discard, { cards: GET_CARDS_ON_BOTTOM_OF_DECK(player, 1), sourceCard: this });

      const psyduckCard = cardList.getPokemonCard();
      if (!psyduckCard) {
        return state;
      }

      // Get attached cards (energy, tools, etc.)
      const otherCards = cardList.cards.filter(
        (card) =>
          !(card instanceof PokemonCard) &&
          !cardList.getPokemons().includes(card as PokemonCard) &&
          (!cardList.tools || !cardList.tools.includes(card)),
      );
      const tools = [...cardList.tools];

      // Move tools to discard
      if (tools.length > 0) {
        for (const tool of tools) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [tool], sourceCard: this });
        }
      }

      // Move other cards to discard first
      if (otherCards.length > 0) {
        MOVE_CARDS(store, state, cardList, player.discard, { cards: otherCards });
      }

      // Create temporary card list and move Psyduck to top of deck
      const deckTop = new CardList();
      MOVE_CARDS(store, state, cardList, deckTop, { cards: [psyduckCard] });
      MOVE_CARDS(store, state, deckTop, player.deck, { toTop: true });

      cardList.clearEffects();
    }
    return state;
  }
}
