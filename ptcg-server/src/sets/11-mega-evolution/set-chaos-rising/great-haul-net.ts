import { pokemonHasCardType } from '../../../game';
import { Player } from '../../../game/store/state/player';
import { Card } from '../../../game/store/card/card';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import { StateUtils } from '../../../game/store/state-utils';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import { CardType } from '../../../game/store/card/card-types';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const blocked: number[] = [];
  player.discard.cards.forEach((c, index) => {
    const isWaterPokemon = c instanceof PokemonCard && pokemonHasCardType(c, CardType.WATER);
    const isBasicWaterEnergy =
      c instanceof EnergyCard &&
      c.energyType === EnergyType.BASIC &&
      c.provides.includes(CardType.WATER);
    if (!isWaterPokemon && !isBasicWaterEnergy) {
      blocked.push(index);
    }
  });
  const eligibleCount = player.discard.cards.length - blocked.length;
  if (eligibleCount === 0) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }
  effect.preventDefault = true;
  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DECK,
      player.discard,
      {},
      { min: 0, max: 6, allowCancel: false, blocked, maxPokemons: 3, maxBasicEnergies: 3 },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );
  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: effect.trainerCard });
  }
  const cardList = StateUtils.findCardList(state, effect.trainerCard);
  if (cardList) MOVE_CARDS(store, state, cardList, player.discard, { cards: [effect.trainerCard], sourceCard: effect.trainerCard });
  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class GreatHaulNet extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'CRI';
  public regulationMark = 'J';
  public name: string = 'Great Haul Net';
  public fullName: string = 'Big Catch Net M4';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';
  public text: string = `Choose 1 or both:

  • Shuffle up to 3 [W] Pokémon from your discard pile into your deck.
  • Shuffle up to 3 Basic [W] Energy cards from your discard pile into your deck.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const blocked: number[] = [];
    player.discard.cards.forEach((c, index) => {
      const isWaterPokemon = c instanceof PokemonCard && pokemonHasCardType(c, CardType.WATER);
      const isBasicWaterEnergy =
        c instanceof EnergyCard &&
        c.energyType === EnergyType.BASIC &&
        c.provides.includes(CardType.WATER);
      if (!isWaterPokemon && !isBasicWaterEnergy) {
        blocked.push(index);
      }
    });
    if (player.discard.cards.length - blocked.length === 0) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}
