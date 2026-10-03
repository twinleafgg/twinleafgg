import {
  ChoosePokemonPrompt,
  GameMessage,
  getPokemonCardTypes,
  PlayerType,
  PokemonCard,
  SlotType,
} from '../../game';
import { CardType, TrainerType } from '../../game/store/card/card-types';
import { TrainerCard } from '../../game/store/card/trainer-card';
import { CheckPokemonTypeEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class FriendBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'SK';
  public setNumber = '126';
  public name: string = 'Friend Ball';
  public fullName: string = 'Friend Ball SK';
  public cardImage: string = 'assets/cardback.png';

  public text: string =
    "Choose 1 of your opponent's Pokémon. Search your deck for a Baby Pokémon, Basic Pokémon, or Evolution card of the same type (color), show it to your opponent, and put it into your hand. Shuffle your deck afterward.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      effect.preventDefault = true;

      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_CARD_TO_HAND,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return state;
          }
          const target = targets[0];
          const checkEffect = new CheckPokemonTypeEffect(target);
          store.reduceEffect(state, checkEffect);
          const uniqueTypes = new Set<CardType>();
          checkEffect.cardTypes.forEach((type) => uniqueTypes.add(type));

          const blocked: number[] = [];
          player.deck.cards.forEach((card, index) => {
            if (
              card instanceof PokemonCard &&
              getPokemonCardTypes(card).some((type) => uniqueTypes.has(type))
            ) {
              // Valid card
            } else {
              blocked.push(index);
            }
          });

          SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
            store,
            state,
            player,
            {},
            { blocked, min: 0, max: 1 },
          );
        },
      );
    }

    return state;
  }
}
