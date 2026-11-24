import { GameError, GameMessage, Player, PokemonCard, State, StoreLike } from '../../../game';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SEARCH_DECK_FOR_CARDS_TO_HAND } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TeamPlasmaBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TEAM_PLASMA, CardTag.BALL];
  public set: string = 'PLF';
  public name: string = 'Team Plasma Ball';
  public fullName: string = 'Team Plasma Ball PLF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';

  public text: string =
    'Search your deck for a Team Plasma Pokémon, reveal it, and put it into your hand. Shuffle your deck afterward.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard && card.hasTag(CardTag.TEAM_PLASMA))) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON },
        { min: 0, max: 1, allowCancel: false, blocked },
      );
    }

    return state;
  }
}
