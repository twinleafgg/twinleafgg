import { Effect } from '../../../game/store/effects/effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, CardTag } from '../../../game/store/card/card-types';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { GameError, GameMessage, StateUtils, PlayerType, PokemonCard } from '../../../game';
import { DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { Player } from '../../../game/store/state/player';

export class Jett extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'PBL';
  public name: string = 'Jett';
  public fullName: string = 'Jett MEP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';

  public text: string =
    "Draw a card for each of your opponent's Mega Evolution Pokémon ex in play.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Check if deck has cards
    if (player.deck.cards.length === 0) {
      return false;
    }

    // Check if supporter already played this turn
    if (player.supporterTurn > 0) {
      return false;
    }

    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: this });

      // Count opponent's Mega Evolution Pokemon ex in play
      let megaEvolutionExCount = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, pokemonCard) => {
        if (
          pokemonCard instanceof PokemonCard &&
          pokemonCard.hasTag(CardTag.POKEMON_SV_MEGA) &&
          pokemonCard.hasTag(CardTag.POKEMON_ex)
        ) {
          megaEvolutionExCount++;
        }
      });

      DRAW_CARDS(store, state, player, megaEvolutionExCount);
    }

    return state;
  }
}
