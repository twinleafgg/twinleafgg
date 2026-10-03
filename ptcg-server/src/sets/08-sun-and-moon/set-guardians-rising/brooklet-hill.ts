import {
  Card,
  ChooseCardsPrompt,
  PokemonCard,
  PokemonCardList,
  ShuffleDeckPrompt,
  pokemonHasCardType,
} from '../../../game';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

function* useStadium(
  next: Function,
  store: StoreLike,
  state: State,
  effect: UseStadiumEffect,
): IterableIterator<State> {
  const player = effect.player;

  const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);

  if (player.deck.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (
      card instanceof PokemonCard &&
      !pokemonHasCardType(card, CardType.WATER) &&
      !pokemonHasCardType(card, CardType.FIGHTING)
    ) {
      blocked.push(index);
    }
  });

  if (slots.length == 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  } else {
    let cards: Card[] = [];
    return store.prompt(
      state,
      new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.deck,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: 1, allowCancel: false, blocked },
      ),
      (selectedCards) => {
        cards = selectedCards || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          return state;
        }

        cards.forEach((card, index) => {
          store.reduceEffect(
            state,
            new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]),
          );
        });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
          player.deck.applyOrder(order);
        });
      },
    );
  }
}

export class BrookletHill extends TrainerCard {
  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '120';

  protected _trainerType = TrainerType.STADIUM;

  public set = 'GRI';

  public name = 'Brooklet Hill';

  public fullName = 'Brooklet Hill GRI';

  public text =
    "Once during each player's turn, that player may search their deck for a Basic [W] Pokémon or Basic [F] Pokémon, put it onto their Bench, and shuffle their deck.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const generator = useStadium(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}
