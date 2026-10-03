import { Effect } from '../../../game/store/effects/effect';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { PlayerType } from '../../..';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Cheryl extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'BST';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '123';

  public regulationMark = 'E';

  public name: string = 'Cheryl';

  public fullName: string = 'Cheryl BST';

  public text: string =
    'Heal all damage from each of your Evolution Pokémon. If you do, discard all Energy from the Pokémon that were healed in this way.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      let anyHealed = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const pokemon = cardList.getPokemonCard();

        // Only check Evolution Pokémon
        if (pokemon && pokemon.stage !== Stage.BASIC && cardList.damage > 0) {
          // Heal the Pokémon
          const healEffect = new HealEffect(player, cardList, cardList.damage);
          state = store.reduceEffect(state, healEffect);
          anyHealed = true;
        }
      });

      // If any Pokémon were healed, discard Energy cards from those Pokémon
      if (anyHealed) {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          const pokemon = cardList.getPokemonCard();
          if (pokemon && pokemon.stage !== Stage.BASIC) {
            const energyCards = cardList.cards.filter((c) => c.superType === SuperType.ENERGY);
            MOVE_CARDS(store, state, cardList, player.discard, {
              cards: energyCards,
              sourceCard: this,
            });
          }
        });
      }

      return state;
    }
    return state;
  }
}
