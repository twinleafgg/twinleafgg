import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  State,
  StoreLike,
  TrainerCard,
  GameError,
  GameMessage,
  Player,
  PlayerType,
  PokemonCard,
} from '../../../game';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class RepeatBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'PRC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '136';
  public name: string = 'Repeat Ball';
  public fullName: string = 'Repeat Ball PRC';

  public text: string =
    'Search your deck for a Pokémon with the same name as 1 of your Pokémon in play, reveal it, and put it into your hand. Shuffle your deck afterward.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      effect.preventDefault = true;
      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      // Gather names of player's own Pokemon in play
      const playerPokemonNames: string[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (!playerPokemonNames.includes(card.name)) {
          playerPokemonNames.push(card.name);
        }
      });

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && !playerPokemonNames.includes(card.name)) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked },
      );
    }

    return state;
  }
}
