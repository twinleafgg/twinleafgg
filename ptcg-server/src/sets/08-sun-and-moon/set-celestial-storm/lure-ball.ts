import { CardTag, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { State, StoreLike, TrainerCard, GameError, GameMessage, Player } from '../../../game';
import {
  MULTIPLE_COIN_FLIPS_PROMPT,
  SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND,
} from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class LureBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'CES';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '138';
  public name: string = 'Lure Ball';
  public fullName: string = 'Lure Ball CES';

  public text: string =
    'Flip 3 coins. For each heads, put an Evolution Pokémon from your discard pile into your hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    // Need an Evolution Pokémon in the discard pile
    return player.discard.cards.some((c) => c instanceof PokemonCard && c.stage !== Stage.BASIC);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Check if there are any Evolution Pokemon in the discard
      const hasEvolutionInDiscard = player.discard.cards.some(
        (c) => c instanceof PokemonCard && c.stage !== Stage.BASIC,
      );

      if (!hasEvolutionInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        const heads = results.filter((r) => r).length;
        if (heads === 0) {
          return;
        }

        // Count how many Evolution Pokemon are available in discard
        const blocked: number[] = [];
        let evolutionCount = 0;
        player.discard.cards.forEach((c, index) => {
          if (c instanceof PokemonCard && c.stage !== Stage.BASIC) {
            evolutionCount++;
          } else {
            blocked.push(index);
          }
        });

        const maxChoose = Math.min(heads, evolutionCount);

        SEARCH_DISCARD_PILE_FOR_CARDS_TO_HAND(
          store,
          state,
          player,
          this,
          { superType: SuperType.POKEMON },
          { min: maxChoose, max: maxChoose, allowCancel: false, blocked },
        );
      });
    }

    return state;
  }
}
