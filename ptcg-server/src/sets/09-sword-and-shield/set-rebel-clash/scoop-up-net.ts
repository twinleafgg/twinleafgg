import {
  CardTarget,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  TrainerCard,
} from '../../../game';
import { CardTag, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARD_TO, MOVE_POKEMON_OFF_BOARD } from '../../../game/store/prefabs/prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class ScoopUpNet extends TrainerCard {
  public name = 'Scoop Up Net';
  public cardImage: string = 'assets/cardback.png';
  public setNumber = '165';
  public set = 'RCL';
  public fullName = 'Scoop Up Net RCL';
  public superType = SuperType.TRAINER;
  protected _trainerType = TrainerType.ITEM;
  public text =
    "Put 1 of your Pokémon that isn't a Pokémon V or a Pokémon-GX into your hand. (Discard all attached cards.)";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (
          card instanceof PokemonCard &&
          (card.hasTag(CardTag.POKEMON_GX) ||
            card.hasTag(CardTag.POKEMON_V) ||
            card.hasTag(CardTag.POKEMON_VSTAR) ||
            card.hasTag(CardTag.POKEMON_VMAX))
        ) {
          blocked.push(target);
        }
      });

      MOVE_CARD_TO(state, effect.trainerCard, player.supporter);
      effect.preventDefault = true;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false, blocked },
        ),
        (result) => {
          const cardList = result.length > 0 ? result[0] : null;
          if (cardList !== null) {
            MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
              pokemonDestination: player.hand,
              attachedDestination: player.discard,
              sourceCard: this,
            });
          }
        },
      );
    }

    return state;
  }
}
