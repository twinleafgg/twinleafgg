import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  PowerType,
  GameError,
  Card,
  ChooseCardsPrompt,
  GameLog,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COPY_ATTACK_VIA_ABILITY } from '../../../game/store/prefabs/copy-attack-prefabs';
import { WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Mew extends PokemonCard {
  protected _tags = [CardTag.PRIME];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 60;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [];

  public powers = [
    {
      name: 'Lost Link',
      powerType: PowerType.POKEBODY,
      useWhenInPlay: true,
      text: "Mew can use the attacks of all of the Pokémon in the Lost Zone (both yours and your opponent's). (You still need the necessary Energy to use each attack.) ",
    },
  ];

  public attacks = [
    {
      name: 'See Off',
      cost: [CardType.PSYCHIC],
      damage: 0,
      text: 'Search your deck for 1 Pokémon and put it in the Lost Zone. Shuffle your deck afterward.',
    },
  ];

  public set: string = 'TM';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '97';

  public name: string = 'Mew';

  public fullName: string = 'Mew TM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let cards: Card[] = [];

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.POKEMON },
          { min: 0, max: 1, allowCancel: true },
        ),
        (selected) => {
          cards = selected || [];

          cards.forEach((card) => {
            MOVE_CARDS(store, state, player.deck, player.lostzone, { cards: [card], sourceCard: this });

            store.log(state, GameLog.LOG_PLAYER_PUTS_CARD_IN_LOST_ZONE, {
              name: player.name,
              card: card.name,
            });
          });
          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const pokemonCard = player.active.getPokemonCard();

      if (pokemonCard !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const extraCards = player.lostzone.cards.filter(
        (card): card is PokemonCard => card instanceof PokemonCard,
      );
      return COPY_ATTACK_VIA_ABILITY(store, state, effect, {
        copycatCard: this,
        allowCancel: false,
        extraCards,
      });
    }
    return state;
  }
}
